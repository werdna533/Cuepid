import { NextRequest } from "next/server";
import {
  getToneVoiceSettings,
  getPersonaForScenario,
  adjustForDifficulty,
  EmotionalTone,
} from "@/lib/toneToVoiceSettings";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

// Default voice ID (Rachel - versatile female voice)
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

export interface TTSRequest {
  text: string;
  scenarioCategory?: "romantic" | "social" | "conflict" | "professional";
  tone?: EmotionalTone | string;
  voiceId?: string;
  difficulty?: number;
}

export async function POST(req: NextRequest) {
  try {
    if (!ELEVENLABS_API_KEY) {
      console.error("ELEVENLABS_API_KEY is not set in environment variables");
      return Response.json(
        { error: "ElevenLabs API key not configured. Please set ELEVENLABS_API_KEY in your .env.local file." },
        { status: 500 }
      );
    }

    const body: TTSRequest = await req.json();
    const { text, scenarioCategory, tone, voiceId, difficulty } = body;

    if (!text || text.trim().length === 0) {
      return Response.json({ error: "Text is required" }, { status: 400 });
    }

    // Get voice persona based on scenario category
    let selectedVoiceId = voiceId || DEFAULT_VOICE_ID;
    if (scenarioCategory && !voiceId) {
      const persona = getPersonaForScenario(scenarioCategory);
      selectedVoiceId = persona.voiceId;
    }

    // Get voice settings based on tone
    let voiceSettings = getToneVoiceSettings(tone || "neutral");

    // Adjust for difficulty if provided
    if (difficulty) {
      voiceSettings = adjustForDifficulty(voiceSettings, difficulty);
    }

    // Call ElevenLabs TTS API
    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${selectedVoiceId}/stream`,
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: voiceSettings.stability,
            similarity_boost: voiceSettings.similarity_boost,
            style: voiceSettings.style,
            use_speaker_boost: voiceSettings.use_speaker_boost,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", errorText);
      return Response.json(
        { error: "Failed to generate speech" },
        { status: response.status }
      );
    }

    // Stream the audio response
    const audioStream = response.body;
    if (!audioStream) {
      return Response.json(
        { error: "No audio stream returned" },
        { status: 500 }
      );
    }

    return new Response(audioStream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("TTS API error:", error);
    return Response.json(
      { error: "Failed to generate speech" },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check available voices
 */
export async function GET() {
  try {
    if (!ELEVENLABS_API_KEY) {
      return Response.json(
        { error: "ElevenLabs API key not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      return Response.json(
        { error: "Failed to fetch voices" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json({
      voices: data.voices.map((v: { voice_id: string; name: string; labels: Record<string, string> }) => ({
        id: v.voice_id,
        name: v.name,
        labels: v.labels,
      })),
    });
  } catch (error) {
    console.error("Voices API error:", error);
    return Response.json(
      { error: "Failed to fetch voices" },
      { status: 500 }
    );
  }
}
