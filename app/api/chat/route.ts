import { NextRequest } from "next/server";
import { getChatModel } from "@/lib/gemini";
import { scenarios } from "@/lib/scenarios";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_RETRIES = 3;

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
    const { messages, scenarioId, difficulty, gender = "female" } = await req.json();

    const scenario = scenarios[scenarioId];
    if (!scenario) {
      return Response.json({ error: "Invalid scenario" }, { status: 400 });
    }

    let systemPrompt =
      scenario.systemPrompts[difficulty as keyof typeof scenario.systemPrompts];
    
    // Add gender context to the prompt
    const genderIdentity = gender === "male" ? "You are male." : "You are female.";
    systemPrompt = systemPrompt + `\n\n${genderIdentity}`;

    // Build Gemini-compatible history (must start with "user", alternating roles)
    const allButLast = messages.slice(0, -1);

    // If the conversation starts with a model message (starter message),
    // fold it into the system prompt so history starts with "user"
    let historyStart = 0;
    if (allButLast.length > 0 && allButLast[0].role === "model") {
      systemPrompt += `\n\nYou already opened the conversation by saying: "${allButLast[0].content}". Continue naturally from there.`;
      historyStart = 1;
    }

    const model = getChatModel(systemPrompt);

    const history = allButLast
      .slice(historyStart)
      .map((m: { role: string; content: string }) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

    const lastMessage = messages[messages.length - 1].content;

    // Retry with exponential backoff on rate limit errors
    let lastError: unknown = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const chat = model.startChat({ history });
        const result = await chat.sendMessageStream(lastMessage);

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of result.stream) {
                const text = chunk.text();
                if (text) {
                  controller.enqueue(encoder.encode(text));
                }
              }
            } catch (error) {
              console.error("Stream error:", error);
              controller.error(error);
            }
            controller.close();
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
          },
        });
      } catch (error: unknown) {
        lastError = error;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Retry on rate limit (429) errors
        if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("too many requests") || errorMessage.toLowerCase().includes("resource has been exhausted")) {
          const delay = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
          console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await sleep(delay);
          continue;
        }

        // Don't retry other errors
        throw error;
      }
    }

    // All retries exhausted
    console.error("All retries exhausted:", lastError);
    return Response.json(
      { error: "Rate limited by Gemini API. Please wait a moment and try again." },
      { status: 429 }
    );
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
