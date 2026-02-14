"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { scenarios } from "@/lib/scenarios";
import {
  VoiceMetrics,
  aggregateVoiceMetrics,
  identifyStrengthsAndWeaknesses,
  getCommunicationStyleSummary,
} from "@/lib/voiceAnalytics";

interface VoiceAnalytics {
  aggregatedMetrics: VoiceMetrics;
  metricsHistory: VoiceMetrics[];
  strengths: string[];
  weaknesses: string[];
  communicationStyle: string;
  xpEarned: number;
  summary: string;
  suggestions: string[];
  drills: string[];
  nextGoal: string;
}

function VoiceDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const convoId = searchParams.get("convoId");

  const [analytics, setAnalytics] = useState<VoiceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [scenarioTitle, setScenarioTitle] = useState("");
  const [scenarioIcon, setScenarioIcon] = useState("");

  useEffect(() => {
    async function loadAndAnalyze() {
      if (!convoId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch conversation
        const convoRes = await fetch(`/api/conversations/${convoId}`);
        const { conversation } = await convoRes.json();

        const scenario = scenarios[conversation.scenario];
        setScenarioTitle(scenario?.title || conversation.scenario);
        setScenarioIcon(scenario?.icon || "🎤");

        // Get voice metrics history from conversation
        const metricsHistory: VoiceMetrics[] = conversation.voiceMetricsHistory || [];

        if (metricsHistory.length === 0) {
          // Generate mock data for demonstration if no real data
          for (let i = 0; i < 5; i++) {
            metricsHistory.push({
              wpm: 120 + Math.random() * 40,
              fillerFrequency: Math.random() * 15,
              avgPauseMs: 200 + Math.random() * 300,
              smoothnessScore: 50 + Math.random() * 40,
              confidenceScore: 50 + Math.random() * 40,
              empathyScore: 50 + Math.random() * 40,
              initiativeScore: 50 + Math.random() * 40,
              engagementScore: 50 + Math.random() * 40,
              clarityScore: 50 + Math.random() * 40,
            });
          }
        }

        const aggregatedMetrics = aggregateVoiceMetrics(metricsHistory);
        const { strengths, weaknesses } = identifyStrengthsAndWeaknesses(aggregatedMetrics);
        const communicationStyle = getCommunicationStyleSummary(aggregatedMetrics);

        // Generate suggestions based on weaknesses
        const suggestions = generateSuggestions(weaknesses, aggregatedMetrics);
        const drills = generateDrills(weaknesses);
        const nextGoal = generateNextGoal(weaknesses, aggregatedMetrics);

        // Calculate XP
        const baseXP = 30;
        const performanceBonus = Math.round(
          ((aggregatedMetrics.confidenceScore +
            aggregatedMetrics.empathyScore +
            aggregatedMetrics.engagementScore +
            aggregatedMetrics.clarityScore +
            aggregatedMetrics.initiativeScore) /
            500) *
            70
        );
        const xpEarned = baseXP + performanceBonus;

        // Generate summary
        const summary = generateSummary(aggregatedMetrics, strengths, weaknesses);

        setAnalytics({
          aggregatedMetrics,
          metricsHistory,
          strengths,
          weaknesses,
          communicationStyle,
          xpEarned,
          summary,
          suggestions,
          drills,
          nextGoal,
        });
      } catch (error) {
        console.error("Dashboard error:", error);
      }
      setLoading(false);
    }

    loadAndAnalyze();
  }, [convoId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-500 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Analyzing your voice conversation...</p>
          <p className="text-gray-400 text-sm mt-1">This may take a few seconds</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No conversation data found.</p>
          <button
            onClick={() => router.push("/")}
            className="text-rose-500 hover:text-rose-600 font-medium"
          >
            Go home
          </button>
        </div>
      </div>
    );
  }

  const { aggregatedMetrics, metricsHistory, strengths, weaknesses } = analytics;

  // Prepare chart data
  const radarData = [
    { metric: "Confidence", value: aggregatedMetrics.confidenceScore, fullMark: 100 },
    { metric: "Empathy", value: aggregatedMetrics.empathyScore, fullMark: 100 },
    { metric: "Initiative", value: aggregatedMetrics.initiativeScore, fullMark: 100 },
    { metric: "Engagement", value: aggregatedMetrics.engagementScore, fullMark: 100 },
    { metric: "Clarity", value: aggregatedMetrics.clarityScore, fullMark: 100 },
    { metric: "Smoothness", value: aggregatedMetrics.smoothnessScore, fullMark: 100 },
  ];

  const trendData = metricsHistory.map((m, i) => ({
    response: i + 1,
    confidence: m.confidenceScore,
    engagement: m.engagementScore,
    wpm: m.wpm,
  }));

  const speechMetricsData = [
    { name: "WPM", value: aggregatedMetrics.wpm, max: 200 },
    { name: "Smoothness", value: aggregatedMetrics.smoothnessScore, max: 100 },
    { name: "Clarity", value: aggregatedMetrics.clarityScore, max: 100 },
  ];

  const fillerData = metricsHistory.map((m, i) => ({
    response: i + 1,
    fillers: m.fillerFrequency,
  }));

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-emerald-500";
    if (score >= 50) return "text-amber-500";
    return "text-rose-500";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-gray-400 text-sm mb-1">
            {scenarioIcon} {scenarioTitle} • 🎤 Voice Mode
          </p>
          <h1 className="text-3xl font-bold text-gray-800 mb-3">Voice Performance Report</h1>
          <div className="inline-flex items-center gap-2 bg-white rounded-full px-5 py-2 shadow-sm">
            <span className="text-xl font-bold text-rose-500">+{analytics.xpEarned} XP</span>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Summary</h2>
          <p className="text-gray-600 text-sm leading-relaxed">{analytics.summary}</p>
          <div className="mt-3">
            <span className="inline-block bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-sm font-medium">
              Style: {analytics.communicationStyle}
            </span>
          </div>
        </div>

        {/* Speech Metrics Section */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Speech Metrics</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-rose-50 rounded-xl">
              <p className="text-2xl font-bold text-rose-600">{Math.round(aggregatedMetrics.wpm)}</p>
              <p className="text-xs text-gray-500">Words/Min</p>
            </div>
            <div className="text-center p-3 bg-rose-50 rounded-xl">
              <p className={`text-2xl font-bold ${aggregatedMetrics.fillerFrequency <= 5 ? "text-emerald-500" : "text-amber-500"}`}>
                {aggregatedMetrics.fillerFrequency.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">Filler Words</p>
            </div>
            <div className="text-center p-3 bg-rose-50 rounded-xl">
              <p className="text-2xl font-bold text-rose-600">{Math.round(aggregatedMetrics.avgPauseMs)}ms</p>
              <p className="text-xs text-gray-500">Avg Pause</p>
            </div>
            <div className="text-center p-3 bg-rose-50 rounded-xl">
              <p className={`text-2xl font-bold ${getScoreColor(aggregatedMetrics.smoothnessScore)}`}>
                {aggregatedMetrics.smoothnessScore}
              </p>
              <p className="text-xs text-gray-500">Smoothness</p>
            </div>
          </div>

          {/* Filler Word Trend */}
          {fillerData.length > 1 && (
            <div className="h-48">
              <p className="text-sm font-medium text-gray-600 mb-2">Filler Word Trend</p>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fillerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis dataKey="response" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 20]} />
                  <Tooltip />
                  <Bar dataKey="fillers" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Radar Chart */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Communication Skills</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#ffe4e6" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "#374151", fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  name="Your Score"
                  dataKey="value"
                  stroke="#f43f5e"
                  fill="#f43f5e"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend Chart */}
        {trendData.length > 1 && (
          <div className="bg-white rounded-2xl shadow-md p-6 mb-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Performance Trend</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis dataKey="response" tick={{ fontSize: 12 }} label={{ value: "Response #", position: "bottom", fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="confidence" stroke="#f43f5e" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="engagement" stroke="#ec4899" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Strengths & Weaknesses */}
        <div className="grid md:grid-cols-2 gap-5 mb-5">
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-emerald-500">✨</span> Top Strengths
            </h2>
            <ul className="space-y-2">
              {strengths.map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-gray-600">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-medium">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-amber-500">🎯</span> Growth Areas
            </h2>
            <ul className="space-y-2">
              {weaknesses.map((w, i) => (
                <li key={i} className="flex items-center gap-2 text-gray-600">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-medium">
                    {i + 1}
                  </span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Personalized Advice */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>📚</span> Personalized Advice
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Suggestions</h3>
              <ul className="space-y-2">
                {analytics.suggestions.map((s, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-rose-400 mt-0.5">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-700 mb-2">Practice Drills</h3>
              <ul className="space-y-2">
                {analytics.drills.map((d, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-rose-50 rounded-xl p-4">
              <h3 className="font-medium text-rose-700 mb-1">🎯 Next Conversation Goal</h3>
              <p className="text-sm text-rose-600">{analytics.nextGoal}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-white text-gray-700 rounded-xl font-medium shadow-sm hover:shadow-md transition-shadow"
          >
            Back to Home
          </button>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-rose-500 text-white rounded-xl font-medium shadow-sm hover:shadow-md hover:bg-rose-600 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function generateSuggestions(weaknesses: string[], metrics: VoiceMetrics): string[] {
  const suggestions: string[] = [];

  if (weaknesses.includes("Confidence") || metrics.confidenceScore < 50) {
    suggestions.push(
      "Practice speaking more slowly and deliberately to project confidence.",
      "Before responding, take a brief pause to gather your thoughts."
    );
  }

  if (weaknesses.includes("Empathy") || metrics.empathyScore < 50) {
    suggestions.push(
      "Try reflecting back what the other person said before adding your thoughts.",
      "Use phrases like 'I understand' or 'That makes sense' to show you're listening."
    );
  }

  if (weaknesses.includes("Initiative") || metrics.initiativeScore < 50) {
    suggestions.push(
      "Ask more follow-up questions to show genuine interest.",
      "Introduce new topics or share related experiences to keep the conversation flowing."
    );
  }

  if (metrics.fillerFrequency > 10) {
    suggestions.push(
      "Practice replacing filler words with brief pauses instead.",
      "Record yourself speaking and count filler words to build awareness."
    );
  }

  if (metrics.wpm < 100 || metrics.wpm > 180) {
    suggestions.push(
      metrics.wpm < 100
        ? "Try speaking at a slightly faster pace to maintain engagement."
        : "Slow down your speaking pace to improve clarity and connection."
    );
  }

  return suggestions.slice(0, 4);
}

function generateDrills(weaknesses: string[]): string[] {
  const drillMap: Record<string, string[]> = {
    Confidence: [
      "Record yourself answering common questions and review your delivery.",
      "Practice power poses for 2 minutes before conversations.",
    ],
    Empathy: [
      "Practice active listening: summarize what the speaker said before responding.",
      "Watch conversations in movies and identify empathy moments.",
    ],
    Initiative: [
      "Prepare 3 interesting questions before your next conversation.",
      "Practice the 'and' technique: add something new to each response.",
    ],
    Engagement: [
      "Set a goal to elaborate on your answers with at least one example.",
      "Practice storytelling: turn simple answers into brief narratives.",
    ],
    Clarity: [
      "Practice the PREP method: Point, Reason, Example, Point.",
      "Record yourself and identify unclear moments.",
    ],
    "Speech Smoothness": [
      "Read aloud for 5 minutes daily to improve flow.",
      "Practice tongue twisters to improve articulation.",
    ],
  };

  const drills: string[] = [];
  for (const weakness of weaknesses) {
    const weaknessDrills = drillMap[weakness] || [];
    drills.push(...weaknessDrills);
  }

  return drills.slice(0, 4);
}

function generateNextGoal(weaknesses: string[], metrics: VoiceMetrics): string {
  if (metrics.fillerFrequency > 15) {
    return "Focus on reducing filler words by 50% in your next conversation.";
  }

  if (metrics.confidenceScore < 40) {
    return "Practice speaking with deliberate pauses instead of rushing through responses.";
  }

  if (metrics.empathyScore < 40) {
    return "Try to include at least one reflective statement in each response.";
  }

  if (metrics.initiativeScore < 40) {
    return "Ask at least 3 meaningful follow-up questions in your next conversation.";
  }

  if (weaknesses.length > 0) {
    return `Focus on improving your ${weaknesses[0].toLowerCase()} in the next conversation.`;
  }

  return "Challenge yourself by trying a harder difficulty level!";
}

function generateSummary(
  metrics: VoiceMetrics,
  strengths: string[],
  weaknesses: string[]
): string {
  const avgScore =
    (metrics.confidenceScore +
      metrics.empathyScore +
      metrics.initiativeScore +
      metrics.engagementScore +
      metrics.clarityScore) /
    5;

  let performance = "solid";
  if (avgScore >= 75) performance = "excellent";
  else if (avgScore >= 60) performance = "good";
  else if (avgScore < 40) performance = "developing";

  return `You showed ${performance} voice communication skills in this conversation. Your strongest areas were ${strengths.slice(0, 2).join(" and ").toLowerCase()}, which helped create a positive dynamic. To improve further, focus on ${weaknesses[0]?.toLowerCase() || "maintaining consistency"} while keeping your natural conversational style.`;
}

export default function VoiceDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-500" />
        </div>
      }
    >
      <VoiceDashboardContent />
    </Suspense>
  );
}
