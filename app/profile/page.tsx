"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { getLevelProgress } from "@/lib/levels";
import { scenarios } from "@/lib/scenarios";

interface UserData {
  level: number;
  xp: number;
  conversationCount: number;
  strengths: string[];
  weaknesses: string[];
}

interface ConversationData {
  _id: string;
  scenario: string;
  difficulty: string;
  messages: { role: string; content: string; timestamp: number }[];
  analytics?: {
    tone: string;
    engagement: number;
    initiative: number;
    empathy: number;
    clarity: number;
    confidence: number;
    xpEarned: number;
  };
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem("cuepid-user-id");
    if (!userId) {
      router.push("/");
      return;
    }

    Promise.all([
      fetch(`/api/user?visitorId=${userId}`).then((r) => r.json()),
      fetch(`/api/conversations?userId=${userId}`).then((r) => r.json()),
    ])
      .then(([userData, convoData]) => {
        setUser(userData.user);
        setConversations(convoData.conversations || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Profile load error:", err);
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen dotted-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-500" />
      </div>
    );
  }

  if (!user) return null;

  const progress = getLevelProgress(user.xp);

  // Aggregate skills from analyzed conversations
  const analyzedConvos = conversations.filter((c) => c.analytics?.tone);
  const avgSkills =
    analyzedConvos.length > 0
      ? {
          engagement: Math.round(
            analyzedConvos.reduce(
              (s, c) => s + (c.analytics?.engagement || 0),
              0
            ) / analyzedConvos.length
          ),
          initiative: Math.round(
            analyzedConvos.reduce(
              (s, c) => s + (c.analytics?.initiative || 0),
              0
            ) / analyzedConvos.length
          ),
          empathy: Math.round(
            analyzedConvos.reduce(
              (s, c) => s + (c.analytics?.empathy || 0),
              0
            ) / analyzedConvos.length
          ),
          clarity: Math.round(
            analyzedConvos.reduce(
              (s, c) => s + (c.analytics?.clarity || 0),
              0
            ) / analyzedConvos.length
          ),
          confidence: Math.round(
            analyzedConvos.reduce(
              (s, c) => s + (c.analytics?.confidence || 0),
              0
            ) / analyzedConvos.length
          ),
        }
      : null;

  const radarData = avgSkills
    ? [
        { metric: "Engagement", value: avgSkills.engagement },
        { metric: "Initiative", value: avgSkills.initiative },
        { metric: "Empathy", value: avgSkills.empathy },
        { metric: "Clarity", value: avgSkills.clarity },
        { metric: "Confidence", value: avgSkills.confidence },
      ]
    : null;

  return (
    <div className="min-h-screen dotted-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
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
            className="bg-white/80 hover:bg-white rounded-full px-4 py-2 shadow-sm text-sm text-gray-600 hover:text-rose-500 transition-colors"
          >
            {"\u2190"} Home
          </button>
        </div>

        {/* Profile Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">YOUR PROFILE</h2>
          <p className="text-gray-500 text-sm mt-1">
            Track your conversation skills
          </p>
        </div>

        {/* Level Card */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-semibold text-gray-800">
              Level {user.level}
            </span>
            <span className="text-sm text-gray-500">
              {user.xp} / {progress.nextLevelXp} XP
            </span>
          </div>
          <div className="w-full bg-rose-100 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-rose-400 to-rose-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-gray-400">
            <span>Lv. {user.level}</span>
            <span>Lv. {user.level + 1}</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-rose-500">
              {user.conversationCount}
            </div>
            <div className="text-xs text-gray-500 mt-1">Conversations</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-rose-500">{user.xp}</div>
            <div className="text-xs text-gray-500 mt-1">Total XP</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-rose-500">
              {user.level}
            </div>
            <div className="text-xs text-gray-500 mt-1">Level</div>
          </div>
        </div>

        {/* Skills Radar */}
        {radarData && (
          <div className="bg-white rounded-2xl shadow-md p-6 mb-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              AVERAGE PERFORMANCE
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  cx="50%"
                  cy="50%"
                  outerRadius="75%"
                  data={radarData}
                >
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
                    name="Average"
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
        )}

        {/* Strengths & Weaknesses */}
        {(user.strengths.length > 0 || user.weaknesses.length > 0) && (
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="text-sm font-semibold text-emerald-600 mb-2">
                {"\u{2B50}"} STRENGTHS
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {user.strengths.map((s: string) => (
                  <span
                    key={s}
                    className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full text-xs font-medium capitalize"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="text-sm font-semibold text-amber-600 mb-2">
                {"\u{1F3AF}"} FOCUS AREAS
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {user.weaknesses.map((w: string) => (
                  <span
                    key={w}
                    className="bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full text-xs font-medium capitalize"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Conversation History */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            RECENT CONVERSATIONS
          </h2>
          {conversations.length === 0 ? (
            <p className="text-gray-400 text-center py-6">
              No conversations yet. Start your first one!
            </p>
          ) : (
            <div className="space-y-2">
              {conversations.slice(0, 10).map((convo) => {
                const scenario = scenarios[convo.scenario];
                return (
                  <div
                    key={convo._id}
                    onClick={() => router.push(`/dashboard/${convo._id}`)}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-rose-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {scenario?.id === "planning_a_date" ? (
                        <Image
                          src="/scenarios/planning_a_date.png"
                          alt={scenario.title}
                          width={24}
                          height={24}
                          className="rounded"
                        />
                      ) : scenario?.id === "asking_someone_out" || scenario?.id === "making_new_friends" ? (
                        <Image
                          src={`/scenarios/${scenario.id}.png`}
                          alt={scenario.title}
                          width={24}
                          height={24}
                          className="rounded"
                        />
                      ) : scenario?.id === "resolving_misunderstanding" ? (
                        <Image
                          src="/scenarios/resolving_a_misunderstanding.png"
                          alt={scenario.title}
                          width={24}
                          height={24}
                          className="rounded"
                        />
                      ) : scenario?.id === "difficult_conversation" ? (
                        <Image
                          src="/scenarios/setting_boundaries.png"
                          alt={scenario.title}
                          width={24}
                          height={24}
                          className="rounded"
                        />
                      ) : scenario?.id === "practice_weaknesses" ? (
                        <Image
                          src="/scenarios/practice_your_weaknesses.png"
                          alt={scenario.title}
                          width={24}
                          height={24}
                          className="rounded"
                        />
                      ) : (
                        <span className="text-xl">
                          {scenario?.icon || "\u{1F4AC}"}
                        </span>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-800">
                          {scenario?.title || convo.scenario}
                        </div>
                        <div className="text-xs text-gray-400 capitalize">
                          {convo.difficulty} {"\u00B7"} {convo.messages.length}{" "}
                          messages
                          {convo.analytics?.xpEarned &&
                            ` \u00B7 +${convo.analytics.xpEarned} XP`}
                        </div>
                      </div>
                    </div>
                    {convo.analytics?.tone && (
                      <span className="text-xs bg-rose-100 text-rose-600 px-2 py-1 rounded-full capitalize">
                        {convo.analytics.tone}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={() => router.push("/")}
          className="w-full bg-rose-500 text-white py-3 rounded-xl font-medium hover:bg-rose-600 transition-colors"
        >
          Start New Conversation
        </button>
      </div>
    </div>
  );
}
