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
  stability: 0.55, // Optimized for smooth, consistent delivery
  similarity_boost: 0.78, // Enhanced voice clarity
  style: 0.35, // Lower for more natural conversation
  use_speaker_boost: true,
};

/**
 * Comprehensive tone-to-voice parameter mappings
 * Each tone modifies voice characteristics to convey emotion
 */
export const TONE_MAPPINGS: Record<EmotionalTone, ToneConfig> = {
  romantic: {
    stability: 0.52, // Smooth and consistent warmth
    similarity_boost: 0.8, // Clear voice reproduction
    style: 0.35, // Natural conversational intimacy
    use_speaker_boost: true,
    speaking_rate: 0.98, // Near-natural pacing
    description: "Warm and intimate but natural delivery",
  },
  playful: {
    stability: 0.48, // Balanced expressiveness and smoothness
    similarity_boost: 0.77,
    style: 0.38, // Natural playful energy without choppiness
    use_speaker_boost: true,
    speaking_rate: 1.02, // Slightly upbeat but natural
    description: "Energetic and fun delivery with varied intonation",
  },
  warm: {
    stability: 0.53, // Smooth and inviting
    similarity_boost: 0.78,
    style: 0.32, // Very natural friendliness
    use_speaker_boost: true,
    speaking_rate: 0.97,
    description: "Friendly and approachable delivery",
  },
  shy: {
    stability: 0.45, // Smooth hesitancy without artifacts
    similarity_boost: 0.75,
    style: 0.28, // Subtle and gentle
    use_speaker_boost: true, // Maintain clarity even when soft
    speaking_rate: 0.92, // Slightly slower but natural
    description: "Quiet, hesitant, and gentle delivery",
  },
  confused: {
    stability: 0.5,
    similarity_boost: 0.75, // Improved clarity
    style: 0.35, // Natural uncertainty
    use_speaker_boost: true,
    speaking_rate: 0.94, // Slightly hesitant pacing
    description: "Uncertain with rising intonation patterns",
  },
  annoyed: {
    stability: 0.56, // Controlled irritation
    similarity_boost: 0.76,
    style: 0.4, // Reduced to prevent choppy emphasis
    use_speaker_boost: true,
    speaking_rate: 1.03, // Slightly brisk but smooth
    description: "Clipped, impatient delivery",
  },
  cold: {
    stability: 0.62, // Detached but not robotic
    similarity_boost: 0.74, // Maintain voice quality
    style: 0.22, // Minimal but smooth variation
    use_speaker_boost: true,
    speaking_rate: 1.0,
    description: "Flat, emotionless, detached delivery",
  },
  distant: {
    stability: 0.58, // Reserved but fluid
    similarity_boost: 0.72, // Better voice fidelity
    style: 0.25,
    use_speaker_boost: true, // Clarity even when withdrawn
    speaking_rate: 0.96,
    description: "Reserved and emotionally withdrawn",
  },
  sarcastic: {
    stability: 0.5, // Smooth ironic delivery
    similarity_boost: 0.76,
    style: 0.42, // Subtle emphasis without choppiness
    use_speaker_boost: true,
    speaking_rate: 1.0,
    description: "Exaggerated with ironic emphasis",
  },
  nervous: {
    stability: 0.42, // Anxious energy without artifacts
    similarity_boost: 0.74,
    style: 0.38, // Natural nervous variation
    use_speaker_boost: true, // Clarity despite anxiousness
    speaking_rate: 1.06, // Slightly rushed but natural
    description: "Shaky, rushed, uncertain delivery",
  },
  excited: {
    stability: 0.46, // Energetic but smooth
    similarity_boost: 0.78,
    style: 0.4, // Natural enthusiasm without exaggeration
    use_speaker_boost: true,
    speaking_rate: 1.08, // Upbeat but not rushed
    description: "High energy, enthusiastic delivery",
  },
  sad: {
    stability: 0.48, // Melancholic but clear
    similarity_boost: 0.76,
    style: 0.3, // Gentle sadness
    use_speaker_boost: true, // Maintain intelligibility
    speaking_rate: 0.9, // Slower but fluid
    description: "Subdued, downcast delivery",
  },
  angry: {
    stability: 0.52, // Controlled intensity
    similarity_boost: 0.77,
    style: 0.42, // Forceful without harsh choppiness
    use_speaker_boost: true,
    speaking_rate: 1.05, // Slightly forceful pacing
    description: "Intense, forceful delivery",
  },
  neutral: {
    stability: 0.55, // Perfectly balanced smoothness
    similarity_boost: 0.78,
    style: 0.35, // Very natural conversation
    use_speaker_boost: true,
    speaking_rate: 1.0,
    description: "Natural, conversational delivery",
  },
  flirty: {
    stability: 0.5, // Smooth teasing
    similarity_boost: 0.79,
    style: 0.4, // Natural flirtation without overdoing it
    use_speaker_boost: true,
    speaking_rate: 0.98,
    description: "Teasing, playful with warmth",
  },
  supportive: {
    stability: 0.54, // Warm and steady
    similarity_boost: 0.78,
    style: 0.36, // Gentle empathy
    use_speaker_boost: true,
    speaking_rate: 0.95, // Calm, measured pacing
    description: "Caring, empathetic delivery",
  },
  defensive: {
    stability: 0.54, // Controlled tension
    similarity_boost: 0.76,
    style: 0.38, // Natural guardedness
    use_speaker_boost: true,
    speaking_rate: 1.02,
    description: "Guarded, slightly tense delivery",
  },
  hurt: {
    stability: 0.47, // Vulnerable but clear
    similarity_boost: 0.75,
    style: 0.32, // Subtle emotional pain
    use_speaker_boost: true, // Maintain clarity
    speaking_rate: 0.92, // Slower but fluid
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
