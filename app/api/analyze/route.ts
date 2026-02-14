import { NextRequest } from "next/server";
import { getAnalysisModel } from "@/lib/gemini";
import dbConnect from "@/lib/mongodb";
import Conversation from "@/lib/models/Conversation";
import User from "@/lib/models/User";
import { calculateXP, calculateLevel } from "@/lib/levels";

export async function POST(req: NextRequest) {
  try {
    const { conversationId } = await req.json();

    await dbConnect();

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return Response.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Build transcript
    const transcript = conversation.messages
      .map(
        (m: { role: string; content: string }) =>
          `${m.role === "user" ? "User" : "Partner"}: ${m.content}`
      )
      .join("\n");

    const model = getAnalysisModel();

    const prompt = `Analyze this conversation between a User and their conversation Partner.

The scenario was: "${conversation.scenario}" (${conversation.difficulty} difficulty)

Transcript:
${transcript}

Analyze the USER's (NOT the Partner's) communication skills. Return a JSON object with exactly this structure:
{
  "tone": "one word describing the user's overall tone (e.g., warm, nervous, confident, awkward, natural, forced, playful)",
  "engagement": <number 0-100, how actively they participated and kept the conversation going>,
  "initiative": <number 0-100, did they lead the conversation, introduce topics, and ask questions, or just react>,
  "empathy": <number 0-100, did they show understanding of the other person's feelings and perspective>,
  "clarity": <number 0-100, were their messages clear, well-structured, and easy to understand>,
  "confidence": <number 0-100, did they seem self-assured without being arrogant>,
  "suggestions": ["3-5 specific, actionable suggestions for improvement based on their weakest areas"],
  "summary": "A brief 2-3 sentence summary of how the conversation went, what the user did well, and what they could improve"
}

Be constructive but honest. Give realistic scores — not all high and not all low. Consider the difficulty level when evaluating.`;

    const result = await model.generateContent(prompt);
    const analysisText = result.response.text();
    const analysis = JSON.parse(analysisText);

    // Calculate response time and message length stats
    const userMessages = conversation.messages.filter(
      (m: { role: string }) => m.role === "user"
    );
    const avgResponseLength =
      userMessages.length > 0
        ? Math.round(
            userMessages.reduce(
              (sum: number, m: { content: string }) =>
                sum + m.content.split(" ").length,
              0
            ) / userMessages.length
          )
        : 0;

    // Calculate average response time (time between model message and user reply)
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    for (let i = 1; i < conversation.messages.length; i++) {
      if (
        conversation.messages[i].role === "user" &&
        conversation.messages[i - 1].role === "model"
      ) {
        totalResponseTime +=
          conversation.messages[i].timestamp -
          conversation.messages[i - 1].timestamp;
        responseTimeCount++;
      }
    }
    const avgResponseTimeMs =
      responseTimeCount > 0
        ? Math.round(totalResponseTime / responseTimeCount)
        : 0;

    // Calculate XP
    const xpEarned = calculateXP(analysis);

    // Update conversation with analytics
    conversation.analytics = {
      ...analysis,
      avgResponseLength,
      avgResponseTimeMs,
      xpEarned,
    };
    await conversation.save();

    // Update user stats
    const user = await User.findOne({ visitorId: conversation.userId });
    if (user) {
      user.xp += xpEarned;
      user.level = calculateLevel(user.xp);
      user.conversationCount += 1;

      // Update strengths and weaknesses based on latest scores
      const metrics: Record<string, number> = {
        engagement: analysis.engagement,
        initiative: analysis.initiative,
        empathy: analysis.empathy,
        clarity: analysis.clarity,
        confidence: analysis.confidence,
      };
      const sorted = Object.entries(metrics).sort(
        ([, a], [, b]) => b - a
      );
      user.strengths = sorted.slice(0, 2).map(([key]) => key);
      user.weaknesses = sorted.slice(-2).map(([key]) => key);

      await user.save();
    }

    return Response.json({ analytics: conversation.analytics });
  } catch (error) {
    console.error("Analysis error:", error);
    return Response.json(
      { error: "Failed to analyze conversation" },
      { status: 500 }
    );
  }
}
