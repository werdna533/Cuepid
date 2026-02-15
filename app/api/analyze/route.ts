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
import { retrieveDiverseBookKnowledge } from "@/lib/diverseRAG";

type SuggestionItem = string | { text: string; source?: string };

type AnalysisOutput = {
  tone: string;
  engagement: number;
  initiative: number;
  empathy: number;
  clarity: number;
  confidence: number;
  suggestions: SuggestionItem[];
  ragInsights: string[];
  summary: string;
};

function formatBookSourceLabel(item: {
  bookTitle: string;
  chapterTitle?: string;
  pageNumber?: number;
}) {
  return `${item.bookTitle}${item.chapterTitle ? ` - ${item.chapterTitle}` : ""}${item.pageNumber ? ` Page ${item.pageNumber}` : ""}`;
}

function dedupeBookChunksBySource(
  chunks: Awaited<ReturnType<typeof retrieveDiverseBookKnowledge>>
) {
  const map = new Map<string, (typeof chunks)[number]>();
  for (const chunk of chunks) {
    const key = `${chunk.item.bookTitle}::${chunk.item.chapterTitle || ""}::${chunk.item.pageNumber || ""}`;
    const existing = map.get(key);
    if (!existing || chunk.score > existing.score) {
      map.set(key, chunk);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.score - a.score);
}

function dedupeSimilarConversationsById(
  results: Awaited<ReturnType<typeof searchConversations>>
) {
  const map = new Map<string, (typeof results)[number]>();
  for (const result of results) {
    const key = result.item.conversationId;
    const existing = map.get(key);
    if (!existing || result.score > existing.score) {
      map.set(key, result);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.score - a.score);
}

function buildFallbackAnalysis(
  transcript: string,
  knowledgeChunks: Awaited<ReturnType<typeof retrieveDiverseBookKnowledge>> = []
): AnalysisOutput {
  const userTurns = transcript
    .split("\n")
    .filter((line) => line.startsWith("User:")).length;
  const engagement = Math.min(100, 35 + userTurns * 10);

  // Generate suggestions with RAG sources if available
  const baseSuggestions = [
    "Ask at least one follow-up question that deepens the topic.",
    "Mirror one specific detail from your partner to show active listening.",
    "End key messages with a clear next step or invitation.",
  ];

  const suggestions: SuggestionItem[] = baseSuggestions.map((text, i) => {
    if (knowledgeChunks.length > 0) {
      const chunkIndex = i % knowledgeChunks.length;
      const chunk = knowledgeChunks[chunkIndex];
      const source = `from ${chunk.item.bookTitle}${chunk.item.chapterTitle ? ` - ${chunk.item.chapterTitle}` : ""
        }${chunk.item.pageNumber ? ` Page ${chunk.item.pageNumber}` : ""}`;
      return { text, source };
    }
    return text;
  });

  return {
    tone: "natural",
    engagement,
    initiative: Math.max(35, engagement - 5),
    empathy: 55,
    clarity: 60,
    confidence: Math.max(40, engagement - 10),
    suggestions,
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

function toSuggestionArray(value: unknown): SuggestionItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (typeof item === "object" && item !== null) {
        const obj = item as Record<string, unknown>;
        if (typeof obj.text === "string") {
          return {
            text: obj.text.trim(),
            source: typeof obj.source === "string" ? obj.source.trim() : undefined,
          };
        }
      }
      return "";
    })
    .filter((item) => {
      if (typeof item === "string") return item !== "";
      return item.text !== "";
    });
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
    suggestions: toSuggestionArray(raw.suggestions).slice(0, 5),
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

    let similarConversations: Awaited<ReturnType<typeof searchConversations>> = [];
    let knowledgeChunks: Awaited<ReturnType<typeof searchBookContent>> = [];
    try {
      similarConversations = await searchConversations(
        queryForRetrieval,
        8,
        conversation.userId
      );
      similarConversations = similarConversations.filter(
        (result) => result.item.conversationId !== String(conversation._id)
      );
      similarConversations = dedupeSimilarConversationsById(
        similarConversations
      ).slice(0, 5);
    } catch (error) {
      console.warn("Conversation vector retrieval skipped:", error);
    }

    try {
      const rawChunks = await retrieveDiverseBookKnowledge(queryForRetrieval, 15);
      // Only keep high-quality matches (>50% similarity)
      knowledgeChunks = rawChunks.filter(chunk => chunk.score > 0.5);
      // If we don't have enough high-quality results, lower threshold slightly
      if (knowledgeChunks.length < 5) {
        knowledgeChunks = rawChunks.filter(chunk => chunk.score > 0.35);
      }
      knowledgeChunks = dedupeBookChunksBySource(knowledgeChunks).slice(0, 6);
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
              `${index + 1}. Similarity ${(result.score * 100).toFixed(1)}%, Source: ${formatBookSourceLabel(result.item)}, Excerpt: ${result.item.content.slice(0, 350)}`
          )
          .join("\n")
        : "No book knowledge retrieved.";

    const referenceEntries = [
      ...similarConversations.map((result) => ({
        key: `conv::${result.item.conversationId}`,
        text: `Similar conversation (${(result.score * 100).toFixed(1)}%): ${result.item.scenario || "unknown"}`,
        score: result.score,
      })),
      ...knowledgeChunks.map((result) => {
        const sourceLabel = formatBookSourceLabel(result.item);
        return {
          key: `book::${sourceLabel}`,
          text: `Book (${(result.score * 100).toFixed(1)}%): ${sourceLabel}`,
          score: result.score,
        };
      }),
    ];

    const bestReferenceByKey = new Map<string, (typeof referenceEntries)[number]>();
    for (const entry of referenceEntries) {
      const existing = bestReferenceByKey.get(entry.key);
      if (!existing || entry.score > existing.score) {
        bestReferenceByKey.set(entry.key, entry);
      }
    }
    const referenceSources = Array.from(bestReferenceByKey.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((entry) => entry.text);

    const model = getAnalysisModel();

    const prompt = `Analyze this conversation between a User and their conversation Partner.

The scenario was: "${conversation.scenario}" (${conversation.difficulty} difficulty)

Transcript:
${transcript}

RAG context - similar past conversations from this user:
${similarConversationsText}

RAG context - relationship communication knowledge from books:
${bookKnowledgeText}

Analyze the USER's (NOT the Partner's) communication skills, using the second person (you, your). Return a JSON object with exactly this structure:
{
  "tone": "one word describing the user's overall tone (e.g., warm, nervous, confident, awkward, natural, forced, playful)",
  "engagement": <number 0-100, how actively they participated and kept the conversation going>,
  "initiative": <number 0-100, did they lead the conversation, introduce topics, and ask questions, or just react>,
  "empathy": <number 0-100, did they show understanding of the other person's feelings and perspective>,
  "clarity": <number 0-100, were their messages clear, well-structured, and easy to understand>,
  "confidence": <number 0-100, did they seem self-assured without being arrogant>,
  "suggestions": [
    "Generate 3-5 actionable tips, ALL must be based on the book knowledge provided above",
    "EVERY suggestion MUST use this format: {\"text\": \"actionable tip\", \"source\": \"from [Book Title] - [Chapter Title]\"}",
    "Use concepts, theories, and advice DIRECTLY from the book excerpts above",
    "Try to use different books for different suggestions to show diversity",
    "Make each tip specific and actionable for this user's situation"
  ],
  "ragInsights": ["2-4 concise insights explicitly grounded in the provided RAG context"],
  "summary": "A brief 2-3 sentence summary of how the conversation went, what the user did well, and what they could improve"
}

🔴 CRITICAL REQUIREMENTS FOR SUGGESTIONS:
- ALL suggestions MUST come from the book knowledge provided above
- EVERY suggestion MUST include a source attribute showing which book and chapter it came from
- Use format: {\"text\": \"your suggestion based on book concept\", \"source\": \"from [Book Title] - [Chapter Title]\"}
- Try to pull from DIFFERENT books to show knowledge diversity (you have ${knowledgeChunks.length} excerpts from multiple books)
- Reference specific theories, models, or concepts mentioned in the book excerpts
- If a book excerpt mentions a specific technique or principle, use it in your suggestion

Example suggestions format (FOLLOW THIS EXACTLY):
[
  {\"text\": \"Apply the 'investment model' theory - demonstrate commitment by initiating plans for future shared activities\", \"source\": \"from Intimate Relationships - Chapter 6: Commitment\"},
  {\"text\": \"Use secure attachment communication - express needs directly while showing trust in your partner's responsiveness\", \"source\": \"from Attachment and Loss - Chapter 3: Attachment Styles\"},
  {\"text\": \"Practice the reciprocity principle - match your partner's self-disclosure depth to build mutual trust\", \"source\": \"from The Social Animal - Chapter 8: Interpersonal Attraction\"}
]

Ground feedback in transcript evidence, but derive improvement suggestions from the book knowledge above.
Be constructive but honest. Give realistic scores, not all high and not all low.
Consider the difficulty level when evaluating.`;

    let analysis: AnalysisOutput;
    try {
      const result = await model.generateContent(prompt);
      const analysisText = result.response.text();
      const parsed = parseModelJson(analysisText);
      analysis = normalizeAnalysis(parsed);

      // AUTO-FIX: If AI returned plain text suggestions, auto-attach sources from RAG
      if (analysis.suggestions.length > 0 && knowledgeChunks.length > 0) {
        const needsSourceFix = analysis.suggestions.some(
          s => typeof s === "string"
        );

        if (needsSourceFix) {
          console.log("Auto-fixing suggestions: adding RAG sources...");
          const fixedSuggestions: SuggestionItem[] = [];

          for (let i = 0; i < analysis.suggestions.length; i++) {
            const suggestion = analysis.suggestions[i];
            const text = typeof suggestion === "string" ? suggestion : suggestion.text;

            // Use different book chunks for different suggestions (round-robin)
            const chunkIndex = i % knowledgeChunks.length;
            const chunk = knowledgeChunks[chunkIndex];

            const source = `from ${formatBookSourceLabel(chunk.item)}`;

            fixedSuggestions.push({ text, source });
          }

          analysis.suggestions = fixedSuggestions;
          console.log(`✅ Fixed ${fixedSuggestions.length} suggestions with RAG sources`);
        }
      }
    } catch (error) {
      console.warn("Model analysis failed, using fallback analysis:", error);
      analysis = buildFallbackAnalysis(transcript, knowledgeChunks);
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
      `Top suggestions: ${analysis.suggestions.slice(0, 2).map(s => typeof s === "string" ? s : s.text).join("; ")}`,
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
