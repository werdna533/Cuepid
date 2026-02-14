/**
 * Dynamic Difficulty Scaling Engine
 * Adjusts conversation difficulty based on user performance
 */

import { VoiceMetrics } from "./voiceAnalytics";

export interface DifficultySettings {
  level: number; // 1-10
  emotionalAmbiguity: number; // 0-1: How unclear emotional signals are
  responseShortness: number; // 0-1: How brief the chatbot responds
  warmth: number; // 0-1: How warm/friendly the chatbot is
  chatbotInitiative: number; // 0-1: How much the chatbot drives conversation
  misunderstandingRate: number; // 0-1: Chance of injecting misunderstandings
  toneComplexity: number; // 0-1: How emotionally layered responses are
}

export interface PerformanceIndicators {
  engagementScore: number;
  empathyScore: number;
  fillerFrequency: number;
  initiativeScore: number;
  clarityScore: number;
  confidenceScore: number;
}

/**
 * Predefined difficulty level configurations
 */
export const DIFFICULTY_LEVELS: Record<number, DifficultySettings> = {
  1: {
    level: 1,
    emotionalAmbiguity: 0.0,
    responseShortness: 0.0,
    warmth: 1.0,
    chatbotInitiative: 0.9,
    misunderstandingRate: 0.0,
    toneComplexity: 0.1,
  },
  2: {
    level: 2,
    emotionalAmbiguity: 0.1,
    responseShortness: 0.1,
    warmth: 0.9,
    chatbotInitiative: 0.8,
    misunderstandingRate: 0.0,
    toneComplexity: 0.2,
  },
  3: {
    level: 3,
    emotionalAmbiguity: 0.15,
    responseShortness: 0.15,
    warmth: 0.85,
    chatbotInitiative: 0.75,
    misunderstandingRate: 0.05,
    toneComplexity: 0.25,
  },
  4: {
    level: 4,
    emotionalAmbiguity: 0.25,
    responseShortness: 0.2,
    warmth: 0.75,
    chatbotInitiative: 0.65,
    misunderstandingRate: 0.1,
    toneComplexity: 0.35,
  },
  5: {
    level: 5,
    emotionalAmbiguity: 0.35,
    responseShortness: 0.3,
    warmth: 0.65,
    chatbotInitiative: 0.55,
    misunderstandingRate: 0.15,
    toneComplexity: 0.45,
  },
  6: {
    level: 6,
    emotionalAmbiguity: 0.45,
    responseShortness: 0.4,
    warmth: 0.55,
    chatbotInitiative: 0.45,
    misunderstandingRate: 0.2,
    toneComplexity: 0.55,
  },
  7: {
    level: 7,
    emotionalAmbiguity: 0.55,
    responseShortness: 0.5,
    warmth: 0.45,
    chatbotInitiative: 0.35,
    misunderstandingRate: 0.25,
    toneComplexity: 0.65,
  },
  8: {
    level: 8,
    emotionalAmbiguity: 0.65,
    responseShortness: 0.6,
    warmth: 0.35,
    chatbotInitiative: 0.25,
    misunderstandingRate: 0.3,
    toneComplexity: 0.75,
  },
  9: {
    level: 9,
    emotionalAmbiguity: 0.75,
    responseShortness: 0.7,
    warmth: 0.25,
    chatbotInitiative: 0.2,
    misunderstandingRate: 0.35,
    toneComplexity: 0.85,
  },
  10: {
    level: 10,
    emotionalAmbiguity: 0.85,
    responseShortness: 0.8,
    warmth: 0.15,
    chatbotInitiative: 0.1,
    misunderstandingRate: 0.4,
    toneComplexity: 0.95,
  },
};

/**
 * Get difficulty settings for a given level
 */
export function getDifficultySettings(level: number): DifficultySettings {
  const clampedLevel = Math.max(1, Math.min(10, Math.round(level)));
  return DIFFICULTY_LEVELS[clampedLevel];
}

/**
 * Calculate difficulty adjustment based on performance
 * Returns a value between -1 and 1
 *   Positive = should increase difficulty
 *   Negative = should decrease difficulty
 */
export function calculateDifficultyAdjustment(
  metrics: PerformanceIndicators,
  currentDifficulty: number
): number {
  // Weights for different metrics
  const weights = {
    engagement: 0.25,
    empathy: 0.2,
    initiative: 0.2,
    clarity: 0.15,
    confidence: 0.2,
    fillerPenalty: -0.15, // Negative weight - high filler = decrease difficulty
  };

  // Normalize scores to 0-1 range
  const normalizedEngagement = metrics.engagementScore / 100;
  const normalizedEmpathy = metrics.empathyScore / 100;
  const normalizedInitiative = metrics.initiativeScore / 100;
  const normalizedClarity = metrics.clarityScore / 100;
  const normalizedConfidence = metrics.confidenceScore / 100;

  // Filler frequency penalty (higher filler = lower score)
  const fillerPenalty = Math.max(0, 1 - metrics.fillerFrequency / 20);

  // Calculate weighted performance score
  const performanceScore =
    normalizedEngagement * weights.engagement +
    normalizedEmpathy * weights.empathy +
    normalizedInitiative * weights.initiative +
    normalizedClarity * weights.clarity +
    normalizedConfidence * weights.confidence +
    (1 - fillerPenalty) * weights.fillerPenalty;

  // Threshold to determine adjustment
  // If performance > 0.7, increase difficulty
  // If performance < 0.4, decrease difficulty
  // Otherwise, small or no adjustment

  let adjustment = 0;

  if (performanceScore > 0.75) {
    // Strong performance - increase by 0.2-0.5
    adjustment = 0.2 + (performanceScore - 0.75) * 1.2;
  } else if (performanceScore > 0.6) {
    // Good performance - small increase
    adjustment = (performanceScore - 0.6) * 0.5;
  } else if (performanceScore < 0.35) {
    // Struggling - decrease by 0.2-0.5
    adjustment = -0.2 - (0.35 - performanceScore) * 1.0;
  } else if (performanceScore < 0.45) {
    // Below average - small decrease
    adjustment = -(0.45 - performanceScore) * 0.5;
  }

  // Limit adjustment rate at extreme difficulties
  if (currentDifficulty <= 2 && adjustment < 0) {
    adjustment *= 0.5; // Slower decrease at low difficulty
  }
  if (currentDifficulty >= 9 && adjustment > 0) {
    adjustment *= 0.5; // Slower increase at high difficulty
  }

  // Clamp to -0.5 to 0.5 per response
  return Math.max(-0.5, Math.min(0.5, adjustment));
}

/**
 * Apply difficulty adjustment and get new difficulty level
 */
export function applyDifficultyAdjustment(
  currentDifficulty: number,
  adjustment: number
): number {
  const newDifficulty = currentDifficulty + adjustment;
  // Clamp to 1-10 range
  return Math.max(1, Math.min(10, newDifficulty));
}

/**
 * Generate system prompt modifier based on difficulty settings
 */
export function getDifficultyPromptModifier(settings: DifficultySettings): string {
  const modifiers: string[] = [];

  // Warmth modifier
  if (settings.warmth < 0.3) {
    modifiers.push("Be emotionally distant and cold. Don't show much interest.");
  } else if (settings.warmth < 0.5) {
    modifiers.push("Be somewhat reserved. Show occasional warmth but don't be too eager.");
  } else if (settings.warmth > 0.8) {
    modifiers.push("Be warm, friendly, and encouraging.");
  }

  // Response length modifier
  if (settings.responseShortness > 0.6) {
    modifiers.push("Keep responses very brief - often just a few words or one short sentence.");
  } else if (settings.responseShortness > 0.4) {
    modifiers.push("Keep responses fairly short - one or two sentences.");
  }

  // Initiative modifier
  if (settings.chatbotInitiative < 0.3) {
    modifiers.push("Don't ask questions or drive the conversation. Let the user lead completely.");
  } else if (settings.chatbotInitiative < 0.5) {
    modifiers.push("Occasionally ask questions but mostly respond to what the user says.");
  }

  // Emotional ambiguity modifier
  if (settings.emotionalAmbiguity > 0.6) {
    modifiers.push(
      "Give subtle, ambiguous emotional signals. Don't make it clear how you feel. " +
        "Use responses that could be interpreted multiple ways."
    );
  } else if (settings.emotionalAmbiguity > 0.4) {
    modifiers.push("Sometimes be a bit unclear about your feelings or intentions.");
  }

  // Tone complexity modifier
  if (settings.toneComplexity > 0.7) {
    modifiers.push(
      "Express complex, layered emotions. You might feel multiple things at once. " +
        "Your responses should have emotional depth and nuance."
    );
  }

  // Misunderstanding injection
  if (settings.misunderstandingRate > 0.2) {
    modifiers.push(
      "Occasionally misinterpret what the user says or bring up concerns " +
        "that create minor friction in the conversation."
    );
  }

  if (modifiers.length === 0) {
    return "";
  }

  return "\n\nDifficulty adjustments: " + modifiers.join(" ");
}

/**
 * Get conversation difficulty label
 */
export function getDifficultyLabel(level: number): string {
  if (level <= 2) return "Very Easy";
  if (level <= 4) return "Easy";
  if (level <= 6) return "Medium";
  if (level <= 8) return "Hard";
  return "Very Hard";
}

/**
 * Calculate improvement metrics over time
 */
export function calculateImprovementTrend(
  metricsHistory: VoiceMetrics[]
): {
  trend: "improving" | "stable" | "declining";
  percentageChange: number;
} {
  if (metricsHistory.length < 3) {
    return { trend: "stable", percentageChange: 0 };
  }

  // Compare first half to second half
  const midpoint = Math.floor(metricsHistory.length / 2);
  const firstHalf = metricsHistory.slice(0, midpoint);
  const secondHalf = metricsHistory.slice(midpoint);

  // Calculate average overall score for each half
  const getOverallScore = (metrics: VoiceMetrics) =>
    (metrics.confidenceScore +
      metrics.empathyScore +
      metrics.initiativeScore +
      metrics.engagementScore +
      metrics.clarityScore) /
    5;

  const firstHalfAvg =
    firstHalf.reduce((sum, m) => sum + getOverallScore(m), 0) / firstHalf.length;
  const secondHalfAvg =
    secondHalf.reduce((sum, m) => sum + getOverallScore(m), 0) / secondHalf.length;

  const percentageChange = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

  let trend: "improving" | "stable" | "declining";
  if (percentageChange > 5) {
    trend = "improving";
  } else if (percentageChange < -5) {
    trend = "declining";
  } else {
    trend = "stable";
  }

  return { trend, percentageChange: Math.round(percentageChange) };
}

/**
 * Generate personalized difficulty recommendation
 */
export function getRecommendedStartingDifficulty(
  userStrengths: string[],
  userWeaknesses: string[],
  previousAverageDifficulty?: number
): number {
  // Default starting difficulty
  let recommended = 3;

  if (previousAverageDifficulty) {
    // If user has history, start near their average
    recommended = Math.round(previousAverageDifficulty);
  }

  // Adjust based on strengths/weaknesses balance
  const strengthCount = userStrengths.length;
  const weaknessCount = userWeaknesses.length;

  if (strengthCount > weaknessCount + 2) {
    recommended += 1;
  } else if (weaknessCount > strengthCount + 2) {
    recommended -= 1;
  }

  return Math.max(1, Math.min(10, recommended));
}
