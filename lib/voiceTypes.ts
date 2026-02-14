/**
 * Voice Conversation State Types
 * Shared types for voice-based conversation management
 */

import { VoiceMetrics } from "./voiceAnalytics";
import { EmotionalTone } from "./toneToVoiceSettings";

export interface VoiceMessage {
  role: "user" | "model";
  content: string;
  audioUrl?: string;
  voiceMetrics?: VoiceMetrics;
  tone?: EmotionalTone;
  timestamp: number;
}

export interface VoiceConversationState {
  mode: "text" | "voice";
  scenario: string;
  difficulty: number;
  voicePersona: string;
  conversationHistory: VoiceMessage[];
  voiceMetricsHistory: VoiceMetrics[];
  strengths: string[];
  weaknesses: string[];
  currentTone: EmotionalTone;
  isRecording: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
}

export interface VoiceChatRequest {
  transcript: string;
  transcriptDurationMs: number;
  scenarioId: string;
  difficulty: number;
  conversationHistory: Array<{
    role: "user" | "model";
    content: string;
    voiceMetrics?: VoiceMetrics;
    tone?: EmotionalTone;
  }>;
  userWeaknesses?: string[];
  voiceMetricsHistory?: VoiceMetrics[];
  desiredTone?: EmotionalTone;
}

export interface VoiceChatResponse {
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

export interface TTSRequest {
  text: string;
  scenarioCategory?: "romantic" | "social" | "conflict" | "professional";
  tone?: EmotionalTone | string;
  voiceId?: string;
  difficulty?: number;
}

export type ConversationPhase = 
  | "idle"           // Waiting for user to start speaking
  | "listening"      // Recording user audio
  | "transcribing"   // Converting speech to text
  | "thinking"       // LLM generating response
  | "synthesizing"   // TTS generating audio
  | "speaking"       // Playing bot audio response
  | "error";         // Error state

export interface ConversationAnalytics {
  totalDurationMs: number;
  userSpeakingTimeMs: number;
  botSpeakingTimeMs: number;
  turnCount: number;
  averageResponseTimeMs: number;
  aggregatedMetrics: VoiceMetrics;
  strengthsDisplayed: string[];
  areasForImprovement: string[];
  missedOpportunities: string[];
}

/**
 * Initial state for voice conversation
 */
export function createInitialVoiceState(
  scenarioId: string,
  difficulty: number,
  voicePersona: string
): VoiceConversationState {
  return {
    mode: "voice",
    scenario: scenarioId,
    difficulty,
    voicePersona,
    conversationHistory: [],
    voiceMetricsHistory: [],
    strengths: [],
    weaknesses: [],
    currentTone: "neutral",
    isRecording: false,
    isProcessing: false,
    isSpeaking: false,
  };
}

/**
 * Compute conversation analytics from state
 */
export function computeConversationAnalytics(
  state: VoiceConversationState
): ConversationAnalytics {
  const { conversationHistory, voiceMetricsHistory } = state;

  // Calculate timing metrics
  const userMessages = conversationHistory.filter((m) => m.role === "user");
  const botMessages = conversationHistory.filter((m) => m.role === "model");

  const totalDurationMs =
    conversationHistory.length > 0
      ? conversationHistory[conversationHistory.length - 1].timestamp -
        conversationHistory[0].timestamp
      : 0;

  // Aggregate voice metrics
  const aggregatedMetrics: VoiceMetrics = {
    wpm: 0,
    fillerFrequency: 0,
    avgPauseMs: 0,
    smoothnessScore: 0,
    confidenceScore: 0,
    empathyScore: 0,
    initiativeScore: 0,
    engagementScore: 0,
    clarityScore: 0,
  };

  if (voiceMetricsHistory.length > 0) {
    const keys = Object.keys(aggregatedMetrics) as (keyof VoiceMetrics)[];
    for (const key of keys) {
      const sum = voiceMetricsHistory.reduce((acc, m) => acc + (m[key] || 0), 0);
      aggregatedMetrics[key] = Math.round(sum / voiceMetricsHistory.length);
    }
  }

  return {
    totalDurationMs,
    userSpeakingTimeMs: 0, // Would need actual audio duration tracking
    botSpeakingTimeMs: 0,
    turnCount: userMessages.length,
    averageResponseTimeMs: 0,
    aggregatedMetrics,
    strengthsDisplayed: state.strengths,
    areasForImprovement: state.weaknesses,
    missedOpportunities: [],
  };
}
