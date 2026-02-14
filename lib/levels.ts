export const levelThresholds = [
  0, 100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000,
];

export function calculateLevel(xp: number): number {
  for (let i = levelThresholds.length - 1; i >= 0; i--) {
    if (xp >= levelThresholds[i]) return i + 1;
  }
  return 1;
}

export function getLevelProgress(xp: number) {
  const level = calculateLevel(xp);
  const currentThreshold = levelThresholds[level - 1] || 0;
  const nextThreshold =
    levelThresholds[level] || levelThresholds[levelThresholds.length - 1];
  const progress =
    ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100;

  return {
    level,
    currentLevelXp: currentThreshold,
    nextLevelXp: nextThreshold,
    percentage: Math.min(100, Math.max(0, progress)),
  };
}

export function calculateXP(analytics: {
  engagement: number;
  initiative: number;
  empathy: number;
  clarity: number;
  confidence: number;
}): number {
  const base = 25;
  const metricsBonus =
    ((analytics.engagement +
      analytics.initiative +
      analytics.empathy +
      analytics.clarity +
      analytics.confidence) /
      500) *
    75;
  return Math.round(base + metricsBonus);
}
