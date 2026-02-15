import { NextRequest } from "next/server";
import { getAnalysisModel } from "@/lib/gemini";
import dbConnect from "@/lib/mongodb";
import Conversation from "@/lib/models/Conversation";
import User from "@/lib/models/User";
import { calculateXP, calculateLevel } from "@/lib/levels";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  searchBookContent,
  searchConversations,
  storeConversationVector,
} from "@/lib/vectorstore";

type AnalysisOutput = {
  tone: string;
  engagement: number;
  initiative: number;
  empathy: number;
  clarity: number;
  confidence: number;
  suggestions: string[];
  ragInsights: string[];
  summary: string;
};

function buildFallbackAnalysis(transcript: string): AnalysisOutput {
  const userTurns = transcript
    .split("\n")
    .filter((line) => line.startsWith("User:")).length;
  const engagement = Math.min(100, 35 + userTurns * 10);
  return {
    tone: "natural",
    engagement,
    initiative: Math.max(35, engagement - 5),
    empathy: 55,
    clarity: 60,
    confidence: Math.max(40, engagement - 10),
    suggestions: [
      "Ask at least one follow-up question that deepens the topic.",
      "Mirror one specific detail from your partner to show active listening.",
      "End key messages with a clear next step or invitation.",
    ],
    ragInsights: [],
    summary:
      "Analysis model output was unstable, so this report uses a fallback scoring pass. Try another run after a short wait for a more detailed breakdown.",
  };
}

function clampScore(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 50;
  return Math.min(100, Math.max(0, Math.round(num)));
}

function parseModelJson(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(withoutFence.slice(start, end + 1));
    }
    throw new Error("Model returned invalid JSON");
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function normalizeAnalysis(raw: Record<string, unknown>): AnalysisOutput {
  return {
    tone:
      typeof raw.tone === "string" && raw.tone.trim()
        ? raw.tone.trim()
        : "natural",
    engagement: clampScore(raw.engagement),
    initiative: clampScore(raw.initiative),
    empathy: clampScore(raw.empathy),
    clarity: clampScore(raw.clarity),
    confidence: clampScore(raw.confidence),
    suggestions: toStringArray(raw.suggestions).slice(0, 5),
    ragInsights: toStringArray(raw.ragInsights).slice(0, 4),
    summary:
      typeof raw.summary === "string" && raw.summary.trim()
        ? raw.summary.trim()
        : "You kept the conversation going and can improve with more targeted follow-up questions.",
  };
}

export async function POST(req: NextRequest) {
  try {
    const { allowed, retryAfterMs } = checkRateLimit();
    if (!allowed) {
      return Response.json(
        { error: `Rate limited. Try again in ${Math.ceil(retryAfterMs / 1000)} seconds.` },
        { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
      );
    }
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

    const queryForRetrieval = `${conversation.scenario} ${conversation.difficulty}\n${transcript}`
      .slice(0, 2500)
      .trim();

    let similarConversations: Awaited<ReturnType<typeof searchConversations>> =
      [];
    let knowledgeChunks: Awaited<ReturnType<typeof searchBookContent>> = [];
    try {
      similarConversations = await searchConversations(
        queryForRetrieval,
        3,
        conversation.userId
      );
      similarConversations = similarConversations.filter(
        (result) => result.item.conversationId !== String(conversation._id)
      );
    } catch (error) {
      console.warn("Conversation vector retrieval skipped:", error);
    }

    try {
      knowledgeChunks = await searchBookContent(queryForRetrieval, 3);
    } catch (error) {
      console.warn("Book vector retrieval skipped:", error);
    }

    const similarConversationsText =
      similarConversations.length > 0
        ? similarConversations
          .map(
            (result, index) =>
              `${index + 1}. Similarity ${(result.score * 100).toFixed(1)}%, Scenario: ${result.item.scenario || "unknown"}, Difficulty: ${result.item.difficulty || "unknown"}, Summary: ${result.item.summary}`
          )
          .join("\n")
        : "No similar past conversations found.";

    const bookKnowledgeText =
      knowledgeChunks.length > 0
        ? knowledgeChunks
          .map(
            (result, index) =>
              `${index + 1}. Similarity ${(result.score * 100).toFixed(1)}%, Source: ${result.item.bookTitle}${result.item.chapterTitle ? ` - ${result.item.chapterTitle}` : ""}, Excerpt: ${result.item.content.slice(0, 350)}`
          )
          .join("\n")
        : "No book knowledge retrieved.";

    const rawReferenceSources = [
      ...similarConversations.map(
        (result) =>
          `Similar conversation (${(result.score * 100).toFixed(1)}%): ${result.item.scenario || "unknown"}`
      ),
      ...knowledgeChunks.map(
        (result) =>
          `Book (${(result.score * 100).toFixed(1)}%): ${result.item.bookTitle}${result.item.chapterTitle ? ` - ${result.item.chapterTitle}` : ""}`
      ),
    ];
    const referenceSources = Array.from(new Set(rawReferenceSources)).slice(
      0,
      10
    );

    const model = getAnalysisModel();

    const prompt = `Analyze this conversation between a User and their conversation Partner.

The scenario was: "${conversation.scenario}" (${conversation.difficulty} difficulty)

Transcript:
${transcript}


RAG context - similar past conversations from this user:
${similarConversationsText}

RAG context - relationship communication knowledge:
${bookKnowledgeText}

Analyze the USER's (NOT the Partner's) communication skills, using the second person (you, your). Return a JSON object with exactly this structure:
{
  "tone": "one word describing the user's overall tone (e.g., warm, nervous, confident, awkward, natural, forced, playful)",
  "engagement": <number 0-100, how actively they participated and kept the conversation going>,
  "initiative": <number 0-100, did they lead the conversation, introduce topics, and ask questions, or just react>,
  "empathy": <number 0-100, did they show understanding of the other person's feelings and perspective>,
  "clarity": <number 0-100, were their messages clear, well-structured, and easy to understand>,
  "confidence": <number 0-100, did they seem self-assured without being arrogant>,
  "suggestions": ["3-5 specific, actionable suggestions for improvement based on their weakest areas"],
  "ragInsights": ["2-4 concise insights explicitly grounded in the provided RAG context"],
  "summary": "A brief 2-3 sentence summary of how the conversation went, what the user did well, and what they could improve"
}

Requirements:
- Ground feedback in transcript evidence first.
- Use RAG context only when relevant; do not hallucinate facts not in transcript or provided context.
- If no RAG context is useful, keep ragInsights empty.
- Be constructive but honest. Give realistic scores, not all high and not all low.
- Consider the difficulty level when evaluating.`;

    let analysis: AnalysisOutput;
    try {
      const result = await model.generateContent(prompt);
      const analysisText = result.response.text();
      const parsed = parseModelJson(analysisText);
      analysis = normalizeAnalysis(parsed);
    } catch (error) {
      console.warn("Model analysis failed, using fallback analysis:", error);
      analysis = buildFallbackAnalysis(transcript);
    }

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
      referenceSources,
      xpEarned,
    };
    await conversation.save();

    const userSummaryForVector = [
      `Tone: ${analysis.tone}`,
      `Summary: ${analysis.summary}`,
      `Top suggestions: ${analysis.suggestions.slice(0, 2).join("; ")}`,
      `Scores - engagement ${analysis.engagement}, initiative ${analysis.initiative}, empathy ${analysis.empathy}, clarity ${analysis.clarity}, confidence ${analysis.confidence}`,
    ].join("\n");
    try {
      await storeConversationVector(
        String(conversation._id),
        conversation.userId,
        userSummaryForVector,
        {
          scenario: conversation.scenario,
          difficulty: conversation.difficulty,
        }
      );
    } catch (error) {
      console.warn("Failed to store conversation vector:", error);
    }

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
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: `Failed to analyze conversation: ${message}` },
      { status: 500 }
    );
  }
}
