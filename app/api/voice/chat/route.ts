import { NextRequest } from "next/server";
import { getChatModel, getAnalysisModel } from "@/lib/gemini";
import { scenarios } from "@/lib/scenarios";
import { checkRateLimit } from "@/lib/rate-limit";
import { analyzeVoiceTranscript, VoiceMetrics } from "@/lib/voiceAnalytics";
import {
  getDifficultySettings,
  getDifficultyPromptModifier,
  calculateDifficultyAdjustment,
  applyDifficultyAdjustment,
} from "@/lib/difficultyEngine";
import { EmotionalTone } from "@/lib/toneToVoiceSettings";

const MAX_RETRIES = 3;

interface VoiceChatMessage {
  role: "user" | "model";
  content: string;
  voiceMetrics?: VoiceMetrics;
  tone?: string;
}

interface VoiceChatRequest {
  transcript: string;
  transcriptDurationMs: number;
  scenarioId: string;
  difficulty: number;
  conversationHistory: VoiceChatMessage[];
  userWeaknesses?: string[];
  voiceMetricsHistory?: VoiceMetrics[];
  desiredTone?: EmotionalTone;
}

interface VoiceChatResponse {
  reply: string;
  tone: EmotionalTone;
  difficultyAdjustment: number;
  newDifficulty: number;
  voiceMetrics: VoiceMetrics;
  conversationNotes: {
    userWasPassive: boolean;
    userShowedEmpathy: boolean;
    missedOpportunity?: string;
    strengthDisplayed?: string;
  };
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

    const body: VoiceChatRequest = await req.json();
    const {
      transcript,
      transcriptDurationMs,
      scenarioId,
      difficulty,
      conversationHistory,
      userWeaknesses = [],
      voiceMetricsHistory = [],
      desiredTone,
    } = body;

    const scenario = scenarios[scenarioId];
    if (!scenario) {
      return Response.json({ error: "Invalid scenario" }, { status: 400 });
    }

    // Analyze the user's voice response
    const voiceMetrics = analyzeVoiceTranscript({
      transcript,
      durationMs: transcriptDurationMs,
    });

    // Calculate difficulty adjustment
    const difficultyAdjustment = calculateDifficultyAdjustment(
      {
        engagementScore: voiceMetrics.engagementScore,
        empathyScore: voiceMetrics.empathyScore,
        fillerFrequency: voiceMetrics.fillerFrequency,
        initiativeScore: voiceMetrics.initiativeScore,
        clarityScore: voiceMetrics.clarityScore,
        confidenceScore: voiceMetrics.confidenceScore,
      },
      difficulty
    );

    const newDifficulty = applyDifficultyAdjustment(difficulty, difficultyAdjustment);
    const difficultySettings = getDifficultySettings(Math.round(newDifficulty));

    // Build system prompt with difficulty adjustments
    const difficultyKey = difficulty <= 3 ? "easy" : difficulty <= 7 ? "medium" : "hard";
    let systemPrompt = scenario.systemPrompts[difficultyKey];
    systemPrompt += getDifficultyPromptModifier(difficultySettings);

    // Add voice-specific context
    systemPrompt += `\n\nThis is a VOICE conversation. The user is speaking to you.`;

    // Add context about user's weaknesses for targeted practice
    if (userWeaknesses.length > 0) {
      systemPrompt += `\n\nThe user is working on improving: ${userWeaknesses.join(", ")}. 
      Occasionally create situations that give them opportunities to practice these skills.`;
    }

    // Add tone guidance
    if (desiredTone) {
      systemPrompt += `\n\nYour current emotional state/tone should be: ${desiredTone}`;
    }

    // Build conversation history for context
    const allButLast = conversationHistory;
    let historyStart = 0;
    if (allButLast.length > 0 && allButLast[0].role === "model") {
      systemPrompt += `\n\nYou already opened the conversation by saying: "${allButLast[0].content}". Continue naturally from there.`;
      historyStart = 1;
    }

    const model = getChatModel(systemPrompt);

    const history = allButLast.slice(historyStart).map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    // Generate response with retries
    let lastError: unknown = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(transcript);
        const reply = result.response.text();

        // Analyze the response and user behavior with analysis model
        const analysisModel = getAnalysisModel();
        let analysis: any;
        try {
          const analysisPrompt = `Analyze this voice conversation exchange and return a JSON object.

User said: "${transcript}"

Chatbot will respond: "${reply}"

User's voice metrics for this response:
- Words per minute: ${voiceMetrics.wpm}
- Filler word frequency: ${voiceMetrics.fillerFrequency}%
- Confidence score: ${voiceMetrics.confidenceScore}
- Empathy score: ${voiceMetrics.empathyScore}
- Initiative score: ${voiceMetrics.initiativeScore}
- Engagement score: ${voiceMetrics.engagementScore}

Return JSON with exactly this structure:
{
  "tone": "the emotional tone for the chatbot's response (one of: romantic, playful, warm, shy, confused, annoyed, cold, distant, sarcastic, nervous, excited, sad, angry, neutral, flirty, supportive, defensive, hurt)",
  "userWasPassive": <boolean - did user mostly just agree/react without adding substance>,
  "userShowedEmpathy": <boolean - did user show understanding of partner's perspective>,
  "missedOpportunity": "optional string - what conversational opportunity did the user miss, if any",
  "strengthDisplayed": "optional string - what did the user do well in this exchange"
}`;

          const analysisResult = await analysisModel.generateContent(analysisPrompt);
          const analysisText = analysisResult.response.text();
          analysis = JSON.parse(analysisText);
        } catch (analysisError) {
          // If analysis fails due to quota, use defaults
          console.warn("Analysis model error, using defaults:", analysisError);
          analysis = {
            tone: "neutral",
            userWasPassive: false,
            userShowedEmpathy: false,
          };
        }

        const response: VoiceChatResponse = {
          reply,
          tone: analysis.tone || "neutral",
          difficultyAdjustment,
          newDifficulty,
          voiceMetrics,
          conversationNotes: {
            userWasPassive: analysis.userWasPassive || false,
            userShowedEmpathy: analysis.userShowedEmpathy || false,
            missedOpportunity: analysis.missedOpportunity,
            strengthDisplayed: analysis.strengthDisplayed,
          },
        };

        return Response.json(response);
      } catch (error: unknown) {
        lastError = error;
        const errorMessage = error instanceof Error ? error.message : String(error);

        // If quota exhausted (free-tier limit: 0), return immediately with helpful message
        if (errorMessage.includes("limit: 0") || errorMessage.includes("quota")) {
          console.error("Gemini quota exhausted (free tier):", errorMessage);
          return Response.json(
            {
              error: "Gemini API quota exhausted. Enable billing in Google Cloud Console or wait 24 hours for free-tier reset.",
              code: "QUOTA_EXHAUSTED",
            },
            { status: 429 }
          );
        }

        if (
          errorMessage.includes("429") ||
          errorMessage.toLowerCase().includes("too many requests") ||
          errorMessage.toLowerCase().includes("resource has been exhausted")
        ) {
          const delay = Math.pow(2, attempt) * 2000;
          console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await sleep(delay);
          continue;
        }

        throw error;
      }
    }

    console.error("All retries exhausted:", lastError);
    return Response.json(
      { error: "Rate limited by Gemini API. Please wait a moment and try again." },
      { status: 429 }
    );
  } catch (error) {
    console.error("Voice Chat API error:", error);
    return Response.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
