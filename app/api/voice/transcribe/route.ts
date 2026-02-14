import { NextRequest } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
// Alternative: Use OpenAI Whisper if preferred
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export interface TranscribeResponse {
  transcript: string;
  confidence?: number;
  words?: {
    word: string;
    start: number;
    end: number;
    confidence?: number;
  }[];
  durationMs: number;
}

/**
 * Transcribe audio using ElevenLabs or OpenAI Whisper
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const useWhisper = formData.get("useWhisper") === "true";

    if (!audioFile) {
      return Response.json({ error: "Audio file is required" }, { status: 400 });
    }

    // Get audio duration from the client if provided
    const durationMs = parseInt(formData.get("durationMs") as string) || 0;

    // Choose transcription service
    if (useWhisper && OPENAI_API_KEY) {
      return await transcribeWithWhisper(audioFile, durationMs);
    } else if (ELEVENLABS_API_KEY) {
      return await transcribeWithElevenLabs(audioFile, durationMs);
    } else {
      return Response.json(
        { error: "No transcription API key configured" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Transcribe API error:", error);
    return Response.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}

/**
 * Transcribe using ElevenLabs Speech-to-Text
 */
async function transcribeWithElevenLabs(
  audioFile: File,
  durationMs: number
): Promise<Response> {
  const formData = new FormData();
  formData.append("file", audioFile);
  formData.append("model_id", "scribe_v1");

  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY!,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("ElevenLabs STT error:", errorText);
    return Response.json(
      { error: "Failed to transcribe audio with ElevenLabs" },
      { status: response.status }
    );
  }

  const data = await response.json();

  // ElevenLabs returns { text: string, words?: [...] }
  const result: TranscribeResponse = {
    transcript: data.text || "",
    durationMs: durationMs || estimateDuration(data.words),
    words: data.words?.map((w: { text: string; start: number; end: number; confidence?: number }) => ({
      word: w.text,
      start: w.start,
      end: w.end,
      confidence: w.confidence,
    })),
  };

  // Calculate average confidence from words if available
  if (data.words && data.words.length > 0) {
    const confidences = data.words
      .filter((w: { confidence?: number }) => w.confidence !== undefined)
      .map((w: { confidence: number }) => w.confidence);
    if (confidences.length > 0) {
      result.confidence = confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length;
    }
  }

  return Response.json(result);
}

/**
 * Transcribe using OpenAI Whisper
 */
async function transcribeWithWhisper(
  audioFile: File,
  durationMs: number
): Promise<Response> {
  const formData = new FormData();
  formData.append("file", audioFile);
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "word");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Whisper API error:", errorText);
    return Response.json(
      { error: "Failed to transcribe audio with Whisper" },
      { status: response.status }
    );
  }

  const data = await response.json();

  const result: TranscribeResponse = {
    transcript: data.text || "",
    durationMs: durationMs || (data.duration ? data.duration * 1000 : 0),
    words: data.words?.map((w: { word: string; start: number; end: number }) => ({
      word: w.word,
      start: Math.round(w.start * 1000), // Convert to ms
      end: Math.round(w.end * 1000),
    })),
  };

  return Response.json(result);
}

/**
 * Estimate duration from word timestamps
 */
function estimateDuration(words?: { end: number }[]): number {
  if (!words || words.length === 0) return 0;
  return words[words.length - 1].end;
}
