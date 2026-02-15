"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { scenarios } from "@/lib/scenarios";

type SuggestionItem = string | { text: string; source?: string };

interface Analytics {
  tone: string;
  engagement: number;
  initiative: number;
  empathy: number;
  clarity: number;
  confidence: number;
  avgResponseLength: number;
  avgResponseTimeMs: number;
  suggestions: SuggestionItem[];
  ragInsights: string[];
  referenceSources: string[];
  xpEarned: number;
  summary: string;
}

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const convoId = params.convoId as string;

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [scenarioTitle, setScenarioTitle] = useState("");
  const [scenarioIcon, setScenarioIcon] = useState("");

  useEffect(() => {
    async function loadAndAnalyze() {
      try {
        // Fetch conversation
        const convoRes = await fetch(`/api/conversations/${convoId}`);
        const { conversation } = await convoRes.json();

        const scenario = scenarios[conversation.scenario];
        setScenarioTitle(scenario?.title || conversation.scenario);
        setScenarioIcon(scenario?.icon || "\u{1F4AC}");

        // If already analyzed, use existing analytics
        if (conversation.analytics?.tone) {
          setAnalytics(conversation.analytics);
          setLoading(false);
          return;
        }

        // Run analysis
        const analysisRes = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: convoId }),
        });
        const { analytics: result } = await analysisRes.json();
        setAnalytics(result);
      } catch (error) {
        console.error("Dashboard error:", error);
      }
      setLoading(false);
    }

    loadAndAnalyze();
  }, [convoId]);

  if (loading) {
    return (
      <div className="min-h-screen dotted-background flex items-center justify-center">
        <div className="text-center">
          <Image
            src="/scenarios/favicon.png"
            alt="Loading"
            width={48}
            height={48}
            className="animate-spin mx-auto mb-4"
          />
          <p className="text-gray-500 font-medium">
            Analyzing your conversation...
          </p>
          <p className="text-gray-400 text-sm mt-1">
            This may take a few seconds
          </p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen dotted-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Something went wrong with the analysis.
          </p>
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

  const radarData = [
    { metric: "Engagement", value: analytics.engagement, fullMark: 100 },
    { metric: "Initiative", value: analytics.initiative, fullMark: 100 },
    { metric: "Empathy", value: analytics.empathy, fullMark: 100 },
    { metric: "Clarity", value: analytics.clarity, fullMark: 100 },
    { metric: "Confidence", value: analytics.confidence, fullMark: 100 },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-emerald-500";
    if (score >= 50) return "text-amber-500";
    return "text-rose-500";
  };

  return (
    <div className="min-h-screen dotted-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Main Header with Cuepid */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push("/")}
            className="hover:opacity-80 transition-opacity cursor-pointer"
          >
            <h1 className="text-8xl text-rose-600 advine-pixel-font leading-none">
              Cuepid
            </h1>
          </button>
          <button
            onClick={() => router.push("/")}
            className="bg-white/80 hover:bg-white px-4 py-2 shadow-sm text-sm text-gray-600 hover:text-rose-500 transition-colors"
          >
            Home
          </button>
        </div>

        {/* Report Header */}
        <div className="text-center mb-8">
          <p className="text-gray-400 text-sm mb-1">
            {scenarioTitle}
          </p>
          <h2 className="text-3xl font-bold text-gray-800 mb-3">
            CONVERSATION REPORT
          </h2>
          <div className="inline-flex items-center gap-2 bg-white px-5 py-2 shadow-sm">
            <span className="text-xl font-bold text-rose-500">
              +{analytics.xpEarned} XP
            </span>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white shadow-md p-6 mb-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">SUMMARY</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            {analytics.summary}
          </p>
          <div className="mt-3">
            <span className="inline-block bg-rose-100 text-rose-600 px-3 py-1 text-sm font-medium capitalize">
              Tone: {analytics.tone}
            </span>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="bg-white shadow-md p-6 mb-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            COMMUNICATION SKILLS BREAKDOWN
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#fecdd3" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                />
                <PolarRadiusAxis
                  domain={[0, 100]}
                  tick={{ fill: "#9ca3af", fontSize: 10 }}
                  axisLine={false}
                />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke="#f43f5e"
                  fill="#f43f5e"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          {radarData.map((d) => (
            <div
              key={d.metric}
              className="bg-white shadow-sm p-4 text-center"
            >
              <div className={`text-2xl font-bold ${getScoreColor(d.value)}`}>
                {d.value}
              </div>
              <div className="text-xs text-gray-500 mt-1">{d.metric}</div>
            </div>
          ))}
          <div className="bg-white shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-gray-700">
              {analytics.avgResponseLength}
            </div>
            <div className="text-xs text-gray-500 mt-1">Avg Words/Msg</div>
          </div>
          <div className="bg-white shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-gray-700">
              {(analytics.avgResponseTimeMs / 1000).toFixed(1)}s
            </div>
            <div className="text-xs text-gray-500 mt-1">Avg Response Time</div>
          </div>
        </div>

        {/* Suggestions */}
        <div className="bg-white shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            TIPS FOR NEXT TIME
          </h2>
          <ul className="space-y-3">
            {analytics.suggestions.map((suggestion, i) => {
              const isObject = typeof suggestion === "object";
              const text = isObject ? suggestion.text : suggestion;
              const source = isObject ? suggestion.source : undefined;

              return (
                <li key={i} className="flex items-start gap-3">
                  <span className="bg-rose-100 text-rose-600 w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5 shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {text}
                    </p>
                    {source && (
                      <p className="text-xs text-purple-600 mt-1 italic">
                        Source: {source}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* RAG Insights */}
        {analytics.ragInsights?.length > 0 && (
          <div className="bg-white shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              RESEARCH INSIGHTS
            </h2>
            <ul className="space-y-3">
              {analytics.ragInsights.map((insight, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="bg-sky-100 text-sky-700 w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5 shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {insight}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sources */}
        {analytics.referenceSources?.length > 0 && (
          <div className="bg-white shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              REFERENCES USED
            </h2>
            <ul className="space-y-2">
              {analytics.referenceSources.map((source, i) => (
                <li key={i} className="text-sm text-gray-600">
                  {i + 1}. {source}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/")}
            className="flex-1 bg-white text-rose-500 border border-rose-200 py-3 font-medium hover:bg-rose-50 transition-colors"
          >
            New Conversation
          </button>
          <button
            onClick={() => router.push("/profile")}
            className="flex-1 bg-rose-500 text-white py-3 font-medium hover:bg-rose-600 transition-colors"
          >
            View Profile
          </button>
        </div>
      </div>
    </div>
  );
}
