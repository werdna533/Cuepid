/**
 * Voice Performance Analytics Engine
 * Analyzes speech patterns, confidence, and communication effectiveness
 */

export interface VoiceMetrics {
  wpm: number; // Words per minute
  fillerFrequency: number; // Filler words per 100 words (0-100 scale)
  avgPauseMs: number; // Average pause length in milliseconds
  smoothnessScore: number; // 0-100: Speech flow quality
  confidenceScore: number; // 0-100: Based on hesitation, completeness
  empathyScore: number; // 0-100: Reflective statements, validation
  initiativeScore: number; // 0-100: Questions, topic expansion
  engagementScore: number; // 0-100: Response length, elaboration
  clarityScore: number; // 0-100: Sentence structure, repetition
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface TranscriptAnalysisInput {
  transcript: string;
  wordTimestamps?: WordTimestamp[];
  durationMs: number;
  confidence?: number;
}

// Filler words to detect
const FILLER_WORDS = new Set([
  "um",
  "uh",
  "like",
  "you know",
  "kinda",
  "sorta",
  "basically",
  "literally",
  "actually",
  "honestly",
  "i mean",
  "so",
  "well",
  "right",
  "okay",
  "yeah",
  "er",
  "ah",
]);

// Empathy markers - phrases that show understanding
const EMPATHY_MARKERS = [
  "i understand",
  "that makes sense",
  "i see what you mean",
  "i can imagine",
  "that must be",
  "i hear you",
  "i get it",
  "i feel",
  "i appreciate",
  "thank you for",
  "sounds like",
  "it seems like",
  "i'm sorry",
  "that's valid",
  "you're right",
  "i agree",
];

// Validation phrases
const VALIDATION_PHRASES = [
  "that's a good point",
  "i hadn't thought of that",
  "you make a good point",
  "that's interesting",
  "i like that",
  "great idea",
  "absolutely",
  "definitely",
  "exactly",
  "totally",
];

// Initiative markers - questions and topic expansion
const QUESTION_PATTERNS = [
  /\?$/,
  /^(what|how|why|when|where|who|which|do you|are you|have you|would you|could you|can you)/i,
  /tell me more/i,
  /what about/i,
  /how about/i,
];



/**
 * Calculate words per minute from transcript and duration
 */
function calculateWPM(transcript: string, durationMs: number): number {
  const words = transcript.split(/\s+/).filter((w) => w.length > 0);
  const minutes = durationMs / 60000;
  if (minutes < 0.01) return 0;
  return Math.round(words.length / minutes);
}

/**
 * Count filler words in transcript
 */
function countFillerWords(transcript: string): number {
  const lowerTranscript = transcript.toLowerCase();
  let count = 0;

  for (const filler of FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler}\\b`, "gi");
    const matches = lowerTranscript.match(regex);
    if (matches) {
      count += matches.length;
    }
  }

  return count;
}

/**
 * Calculate filler frequency per 100 words
 */
function calculateFillerFrequency(transcript: string): number {
  const words = transcript.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return 0;

  const fillerCount = countFillerWords(transcript);
  return Math.round((fillerCount / words.length) * 100);
}

/**
 * Calculate average pause length from word timestamps
 */
function calculateAveragePause(wordTimestamps?: WordTimestamp[]): number {
  if (!wordTimestamps || wordTimestamps.length < 2) return 0;

  const pauses: number[] = [];
  for (let i = 1; i < wordTimestamps.length; i++) {
    const pause = wordTimestamps[i].start - wordTimestamps[i - 1].end;
    if (pause > 100) {
      // Only count pauses > 100ms
      pauses.push(pause);
    }
  }

  if (pauses.length === 0) return 0;
  return Math.round(pauses.reduce((a, b) => a + b, 0) / pauses.length);
}

/**
 * Calculate smoothness score based on pauses and filler words
 */
function calculateSmoothnessScore(
  transcript: string,
  avgPauseMs: number,
  fillerFrequency: number
): number {
  // Base score starts at 100
  let score = 100;

  // Penalize for high filler frequency
  score -= Math.min(30, fillerFrequency * 3);

  // Penalize for long pauses (>500ms average is not great)
  if (avgPauseMs > 500) {
    score -= Math.min(25, ((avgPauseMs - 500) / 100) * 5);
  }

  // Penalize for very short responses (less than 5 words)
  const wordCount = transcript.split(/\s+/).filter((w) => w.length > 0).length;
  if (wordCount < 5) {
    score -= 15;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculate confidence score based on various factors
 */
function calculateConfidenceScore(
  transcript: string,
  fillerFrequency: number,
  avgPauseMs: number,
  transcriptConfidence?: number
): number {
  let score = transcriptConfidence ? transcriptConfidence * 100 : 70;

  // Penalize for filler words
  score -= Math.min(20, fillerFrequency * 2);

  // Penalize for long pauses
  if (avgPauseMs > 600) {
    score -= Math.min(15, ((avgPauseMs - 600) / 100) * 3);
  }

  // Check for hedging language
  const hedgingPatterns = [
    /i guess/i,
    /maybe/i,
    /i don't know/i,
    /i'm not sure/i,
    /kind of/i,
    /sort of/i,
    /probably/i,
  ];

  let hedgingCount = 0;
  for (const pattern of hedgingPatterns) {
    if (pattern.test(transcript)) {
      hedgingCount++;
    }
  }
  score -= hedgingCount * 5;

  // Bonus for complete sentences
  if (/[.!?]$/.test(transcript.trim())) {
    score += 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculate empathy score
 */
function calculateEmpathyScore(transcript: string): number {
  const lowerTranscript = transcript.toLowerCase();
  let score = 50; // Base score

  // Check for empathy markers
  for (const marker of EMPATHY_MARKERS) {
    if (lowerTranscript.includes(marker)) {
      score += 8;
    }
  }

  // Check for validation phrases
  for (const phrase of VALIDATION_PHRASES) {
    if (lowerTranscript.includes(phrase)) {
      score += 6;
    }
  }

  // Bonus for using "you" followed by understanding
  if (/you (feel|think|mean|said|mentioned)/i.test(transcript)) {
    score += 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculate initiative score
 */
function calculateInitiativeScore(transcript: string): number {
  let score = 40; // Base score

  // Check for questions
  for (const pattern of QUESTION_PATTERNS) {
    if (pattern.test(transcript)) {
      score += 12;
    }
  }

  // Check for topic introduction
  if (/speaking of|by the way|that reminds me|i wanted to ask/i.test(transcript)) {
    score += 10;
  }

  // Check for suggestions
  if (/we could|we should|how about|what if|let's/i.test(transcript)) {
    score += 10;
  }

  // Longer responses show more engagement
  const wordCount = transcript.split(/\s+/).filter((w) => w.length > 0).length;
  if (wordCount > 20) {
    score += 10;
  } else if (wordCount > 10) {
    score += 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculate engagement score
 */
function calculateEngagementScore(transcript: string): number {
  let score = 40;

  const wordCount = transcript.split(/\s+/).filter((w) => w.length > 0).length;

  // Length-based scoring
  if (wordCount > 30) {
    score += 25;
  } else if (wordCount > 20) {
    score += 20;
  } else if (wordCount > 10) {
    score += 15;
  } else if (wordCount > 5) {
    score += 5;
  }

  // Check for elaboration markers
  const elaborationMarkers = [
    /because/i,
    /since/i,
    /for example/i,
    /like when/i,
    /i remember/i,
    /actually/i,
    /specifically/i,
  ];

  for (const marker of elaborationMarkers) {
    if (marker.test(transcript)) {
      score += 5;
    }
  }

  // Exclamation points show enthusiasm
  const exclamations = (transcript.match(/!/g) || []).length;
  score += Math.min(10, exclamations * 3);

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculate clarity score
 */
function calculateClarityScore(transcript: string): number {
  let score = 60;

  // Check for complete sentences
  const sentences = transcript.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length > 0) {
    score += 10;
  }

  // Penalize for excessive repetition
  const words = transcript.toLowerCase().split(/\s+/);
  const wordFreq = new Map<string, number>();
  for (const word of words) {
    if (word.length > 3) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  }
  const maxRepetition = Math.max(...Array.from(wordFreq.values()), 0);
  if (maxRepetition > 3) {
    score -= (maxRepetition - 3) * 5;
  }

  // Bonus for transitional phrases
  const transitions = [
    /first|second|third/i,
    /also/i,
    /however/i,
    /therefore/i,
    /in addition/i,
    /furthermore/i,
  ];

  for (const transition of transitions) {
    if (transition.test(transcript)) {
      score += 5;
    }
  }

  // Check for run-on sentences (very long without punctuation)
  const longestSentence = Math.max(...sentences.map((s) => s.split(/\s+/).length), 0);
  if (longestSentence > 40) {
    score -= 15;
  } else if (longestSentence > 30) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Main analysis function - computes all voice metrics
 */
export function analyzeVoiceTranscript(input: TranscriptAnalysisInput): VoiceMetrics {
  const { transcript, wordTimestamps, durationMs, confidence } = input;

  const wpm = calculateWPM(transcript, durationMs);
  const fillerFrequency = calculateFillerFrequency(transcript);
  const avgPauseMs = calculateAveragePause(wordTimestamps);

  return {
    wpm,
    fillerFrequency,
    avgPauseMs,
    smoothnessScore: calculateSmoothnessScore(transcript, avgPauseMs, fillerFrequency),
    confidenceScore: calculateConfidenceScore(transcript, fillerFrequency, avgPauseMs, confidence),
    empathyScore: calculateEmpathyScore(transcript),
    initiativeScore: calculateInitiativeScore(transcript),
    engagementScore: calculateEngagementScore(transcript),
    clarityScore: calculateClarityScore(transcript),
  };
}

/**
 * Aggregate metrics from multiple voice responses
 */
export function aggregateVoiceMetrics(metricsHistory: VoiceMetrics[]): VoiceMetrics {
  if (metricsHistory.length === 0) {
    return {
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
  }

  const sum = (key: keyof VoiceMetrics) =>
    metricsHistory.reduce((acc, m) => acc + m[key], 0);

  const count = metricsHistory.length;

  return {
    wpm: Math.round(sum("wpm") / count),
    fillerFrequency: Math.round(sum("fillerFrequency") / count),
    avgPauseMs: Math.round(sum("avgPauseMs") / count),
    smoothnessScore: Math.round(sum("smoothnessScore") / count),
    confidenceScore: Math.round(sum("confidenceScore") / count),
    empathyScore: Math.round(sum("empathyScore") / count),
    initiativeScore: Math.round(sum("initiativeScore") / count),
    engagementScore: Math.round(sum("engagementScore") / count),
    clarityScore: Math.round(sum("clarityScore") / count),
  };
}

/**
 * Generate strengths and weaknesses from metrics
 */
export function identifyStrengthsAndWeaknesses(metrics: VoiceMetrics): {
  strengths: string[];
  weaknesses: string[];
} {
  const scores: { name: string; score: number; label: string }[] = [
    { name: "confidence", score: metrics.confidenceScore, label: "Confidence" },
    { name: "empathy", score: metrics.empathyScore, label: "Empathy" },
    { name: "initiative", score: metrics.initiativeScore, label: "Initiative" },
    { name: "engagement", score: metrics.engagementScore, label: "Engagement" },
    { name: "clarity", score: metrics.clarityScore, label: "Clarity" },
    { name: "smoothness", score: metrics.smoothnessScore, label: "Speech Smoothness" },
  ];

  // Sort by score
  const sorted = [...scores].sort((a, b) => b.score - a.score);

  return {
    strengths: sorted.slice(0, 3).map((s) => s.label),
    weaknesses: sorted.slice(-3).map((s) => s.label),
  };
}

/**
 * Get communication style summary based on metrics
 */
export function getCommunicationStyleSummary(metrics: VoiceMetrics): string {
  const styles: string[] = [];

  if (metrics.empathyScore > 70) {
    styles.push("empathetic");
  }

  if (metrics.initiativeScore > 70) {
    styles.push("proactive");
  } else if (metrics.initiativeScore < 40) {
    styles.push("reactive");
  }

  if (metrics.confidenceScore > 70) {
    styles.push("confident");
  } else if (metrics.confidenceScore < 40) {
    styles.push("hesitant");
  }

  if (metrics.engagementScore > 70) {
    styles.push("engaged");
  }

  if (metrics.clarityScore > 70) {
    styles.push("articulate");
  }

  if (styles.length === 0) {
    return "balanced communicator";
  }

  return styles.slice(0, 3).join(", ") + " communicator";
}
