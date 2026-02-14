/**
 * Tone-to-Voice Settings Mapper for ElevenLabs TTS
 * Maps emotional tones to voice parameters for dynamic expression
 */

export interface ElevenLabsVoiceSettings {
  stability: number; // 0-1: Lower = more expressive, Higher = more consistent
  similarity_boost: number; // 0-1: How closely to match the original voice
  style: number; // 0-1: Style exaggeration (higher = more dramatic)
  use_speaker_boost: boolean; // Enhance voice clarity
  speaking_rate?: number; // Optional: speed modifier
}

export type EmotionalTone =
  | "romantic"
  | "playful"
  | "warm"
  | "shy"
  | "confused"
  | "annoyed"
  | "cold"
  | "distant"
  | "sarcastic"
  | "nervous"
  | "excited"
  | "sad"
  | "angry"
  | "neutral"
  | "flirty"
  | "supportive"
  | "defensive"
  | "hurt";

export interface ToneConfig {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
  speaking_rate: number;
  description: string;
}

/**
 * Default voice settings for neutral tone
 */
export const DEFAULT_VOICE_SETTINGS: ElevenLabsVoiceSettings = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.5,
  use_speaker_boost: true,
};

/**
 * Comprehensive tone-to-voice parameter mappings
 * Each tone modifies voice characteristics to convey emotion
 */
export const TONE_MAPPINGS: Record<EmotionalTone, ToneConfig> = {
  romantic: {
    stability: 0.3, // Lower stability for softer, more breathy delivery
    similarity_boost: 0.85,
    style: 0.8, // High style for warmth
    use_speaker_boost: true,
    speaking_rate: 0.9, // Slightly slower for intimacy
    description: "Soft, warm, and intimate delivery",
  },
  playful: {
    stability: 0.4,
    similarity_boost: 0.75,
    style: 0.85, // High style for energy
    use_speaker_boost: true,
    speaking_rate: 1.1, // Slightly faster, more energetic
    description: "Energetic and fun delivery with varied intonation",
  },
  warm: {
    stability: 0.45,
    similarity_boost: 0.8,
    style: 0.7,
    use_speaker_boost: true,
    speaking_rate: 0.95,
    description: "Friendly and approachable delivery",
  },
  shy: {
    stability: 0.35, // Lower for hesitant quality
    similarity_boost: 0.7,
    style: 0.4, // Lower style for subtlety
    use_speaker_boost: false, // Softer overall
    speaking_rate: 0.85,
    description: "Quiet, hesitant, and gentle delivery",
  },
  confused: {
    stability: 0.5,
    similarity_boost: 0.65,
    style: 0.45,
    use_speaker_boost: true,
    speaking_rate: 0.9,
    description: "Uncertain with rising intonation patterns",
  },
  annoyed: {
    stability: 0.6, // Higher stability for clipped delivery
    similarity_boost: 0.7,
    style: 0.6,
    use_speaker_boost: true,
    speaking_rate: 1.05, // Slightly faster, impatient
    description: "Clipped, impatient delivery",
  },
  cold: {
    stability: 0.8, // High stability for flat, unemotional
    similarity_boost: 0.6, // Lower similarity for detached feel
    style: 0.2, // Minimal style variation
    use_speaker_boost: true,
    speaking_rate: 1.0,
    description: "Flat, emotionless, detached delivery",
  },
  distant: {
    stability: 0.75,
    similarity_boost: 0.55,
    style: 0.25,
    use_speaker_boost: false,
    speaking_rate: 0.95,
    description: "Reserved and emotionally withdrawn",
  },
  sarcastic: {
    stability: 0.45,
    similarity_boost: 0.7,
    style: 0.75, // Higher for dramatic effect
    use_speaker_boost: true,
    speaking_rate: 1.0,
    description: "Exaggerated with ironic emphasis",
  },
  nervous: {
    stability: 0.3, // Low stability for shaky quality
    similarity_boost: 0.65,
    style: 0.5,
    use_speaker_boost: false,
    speaking_rate: 1.15, // Faster, anxious
    description: "Shaky, rushed, uncertain delivery",
  },
  excited: {
    stability: 0.35,
    similarity_boost: 0.8,
    style: 0.9, // Very high style for enthusiasm
    use_speaker_boost: true,
    speaking_rate: 1.2, // Fast and energetic
    description: "High energy, enthusiastic delivery",
  },
  sad: {
    stability: 0.4,
    similarity_boost: 0.75,
    style: 0.35,
    use_speaker_boost: false,
    speaking_rate: 0.8, // Slower, heavier
    description: "Subdued, downcast delivery",
  },
  angry: {
    stability: 0.55,
    similarity_boost: 0.75,
    style: 0.7,
    use_speaker_boost: true,
    speaking_rate: 1.1,
    description: "Intense, forceful delivery",
  },
  neutral: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.5,
    use_speaker_boost: true,
    speaking_rate: 1.0,
    description: "Natural, conversational delivery",
  },
  flirty: {
    stability: 0.35,
    similarity_boost: 0.85,
    style: 0.8,
    use_speaker_boost: true,
    speaking_rate: 0.95,
    description: "Teasing, playful with warmth",
  },
  supportive: {
    stability: 0.45,
    similarity_boost: 0.8,
    style: 0.65,
    use_speaker_boost: true,
    speaking_rate: 0.9,
    description: "Caring, empathetic delivery",
  },
  defensive: {
    stability: 0.6,
    similarity_boost: 0.7,
    style: 0.55,
    use_speaker_boost: true,
    speaking_rate: 1.05,
    description: "Guarded, slightly tense delivery",
  },
  hurt: {
    stability: 0.35,
    similarity_boost: 0.7,
    style: 0.45,
    use_speaker_boost: false,
    speaking_rate: 0.85,
    description: "Wounded, vulnerable delivery",
  },
};

/**
 * Get voice settings for a specific emotional tone
 */
export function getToneVoiceSettings(tone: EmotionalTone | string): ElevenLabsVoiceSettings {
  const normalizedTone = tone.toLowerCase() as EmotionalTone;
  const config = TONE_MAPPINGS[normalizedTone] || TONE_MAPPINGS.neutral;

  return {
    stability: config.stability,
    similarity_boost: config.similarity_boost,
    style: config.style,
    use_speaker_boost: config.use_speaker_boost,
    speaking_rate: config.speaking_rate,
  };
}

/**
 * Blend multiple tones together (useful for complex emotional states)
 */
export function blendTones(
  tones: { tone: EmotionalTone; weight: number }[]
): ElevenLabsVoiceSettings {
  if (tones.length === 0) {
    return DEFAULT_VOICE_SETTINGS;
  }

  const totalWeight = tones.reduce((sum, t) => sum + t.weight, 0);
  
  let stability = 0;
  let similarity_boost = 0;
  let style = 0;
  let speaking_rate = 0;
  let use_speaker_boost_score = 0;

  for (const { tone, weight } of tones) {
    const config = TONE_MAPPINGS[tone] || TONE_MAPPINGS.neutral;
    const normalizedWeight = weight / totalWeight;

    stability += config.stability * normalizedWeight;
    similarity_boost += config.similarity_boost * normalizedWeight;
    style += config.style * normalizedWeight;
    speaking_rate += config.speaking_rate * normalizedWeight;
    use_speaker_boost_score += (config.use_speaker_boost ? 1 : 0) * normalizedWeight;
  }

  return {
    stability: Math.max(0, Math.min(1, stability)),
    similarity_boost: Math.max(0, Math.min(1, similarity_boost)),
    style: Math.max(0, Math.min(1, style)),
    use_speaker_boost: use_speaker_boost_score >= 0.5,
    speaking_rate,
  };
}

/**
 * Adjust voice settings based on difficulty level
 * Higher difficulty = more subtle emotional cues
 */
export function adjustForDifficulty(
  settings: ElevenLabsVoiceSettings,
  difficulty: number // 1-10
): ElevenLabsVoiceSettings {
  // Normalize difficulty to 0-1 scale
  const difficultyFactor = (difficulty - 1) / 9;

  // At higher difficulties, reduce style expressiveness (more subtle)
  const styleReduction = difficultyFactor * 0.3;
  // At higher difficulties, increase stability (less emotional variation)
  const stabilityIncrease = difficultyFactor * 0.2;

  return {
    ...settings,
    style: Math.max(0.1, settings.style - styleReduction),
    stability: Math.min(0.9, settings.stability + stabilityIncrease),
  };
}

/**
 * Voice persona configurations for different scenario types
 */
export interface VoicePersona {
  voiceId: string;
  name: string;
  baseSettings: ElevenLabsVoiceSettings;
  description: string;
}

export const VOICE_PERSONAS: Record<string, VoicePersona> = {
  romantic_interest: {
    voiceId: "EXAVITQu4vr4xnSDxMaL", // Sarah - warm female voice
    name: "Alex",
    baseSettings: {
      stability: 0.4,
      similarity_boost: 0.8,
      style: 0.7,
      use_speaker_boost: true,
    },
    description: "Warm and engaging dating interest",
  },
  friend: {
    voiceId: "pNInz6obpgDQGcFmaJgB", // Adam - friendly male voice
    name: "Jordan",
    baseSettings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.6,
      use_speaker_boost: true,
    },
    description: "Casual, supportive friend",
  },
  acquaintance: {
    voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel - neutral female voice
    name: "Sam",
    baseSettings: {
      stability: 0.55,
      similarity_boost: 0.7,
      style: 0.5,
      use_speaker_boost: true,
    },
    description: "Neutral acquaintance",
  },
  colleague: {
    voiceId: "AZnzlk1XvdvUeBnXmlld", // Demi - professional female voice
    name: "Taylor",
    baseSettings: {
      stability: 0.6,
      similarity_boost: 0.75,
      style: 0.45,
      use_speaker_boost: true,
    },
    description: "Professional colleague",
  },
};

/**
 * Get the appropriate voice persona for a scenario category
 */
export function getPersonaForScenario(
  category: "romantic" | "social" | "conflict" | "professional"
): VoicePersona {
  switch (category) {
    case "romantic":
      return VOICE_PERSONAS.romantic_interest;
    case "social":
      return VOICE_PERSONAS.friend;
    case "conflict":
      return VOICE_PERSONAS.acquaintance;
    case "professional":
      return VOICE_PERSONAS.colleague;
    default:
      return VOICE_PERSONAS.friend;
  }
}
