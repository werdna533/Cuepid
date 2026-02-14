"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { scenarios } from "@/lib/scenarios";

interface UserData {
  level: number;
  xp: number;
  conversationCount: number;
  strengths: string[];
  weaknesses: string[];
}

type ConversationMode = "text" | "voice";
type PartnerGender = "female" | "male";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [globalMode, setGlobalMode] = useState<ConversationMode>("text");
  const [globalDifficulty, setGlobalDifficulty] = useState("easy");
  const [partnerGender, setPartnerGender] = useState<PartnerGender>("female");

  useEffect(() => {
    let id = localStorage.getItem("cuepid-user-id");
    if (!id) {
      id = uuidv4();
      localStorage.setItem("cuepid-user-id", id);
    }

    fetch("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: id }),
    })
      .then((res) => res.json())
      .then((data) => setUser(data.user))
      .catch(console.error);
  }, []);

  const startConversation = (scenarioId: string) => {
    const difficulty = globalDifficulty;
    const mode = globalMode;
    
    // Build weaknesses param for practice_weaknesses scenario
    const weaknessesParam = scenarioId === "practice_weaknesses" && user?.weaknesses?.length 
      ? `&weaknesses=${encodeURIComponent(user.weaknesses.join(","))}`
      : "";
    
    if (mode === "voice") {
      // Convert difficulty name to number for voice mode
      const difficultyNum = difficulty === "easy" ? 3 : difficulty === "medium" ? 5 : 8;
      router.push(`/chat/${scenarioId}/voice?difficulty=${difficultyNum}&gender=${partnerGender}${weaknessesParam}`);
    } else {
      router.push(`/chat/${scenarioId}?difficulty=${difficulty}&gender=${partnerGender}${weaknessesParam}`);
    }
  };

  // Helper to get dynamic description for practice_weaknesses scenario
  const getScenarioDescription = (scenario: typeof scenarios[string]) => {
    if (scenario.id === "practice_weaknesses" && user?.weaknesses?.length) {
      const formatted = user.weaknesses.map(w => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(" and ");
      return (
        <span>
          Practice <strong>{formatted.toLowerCase()}</strong> in a supportive chat with a friend.
        </span>
      );
    }
    return scenario.description;
  };

  // Check if scenario is locked
  const isScenarioLocked = (scenarioId: string) => {
    if (scenarioId === "practice_weaknesses") {
      return !user?.weaknesses?.length || user.weaknesses.length === 0;
    }
    return false;
  };

  const categoryColors: Record<string, string> = {
    romantic: "text-rose-500",
    social: "text-blue-500",
    conflict: "text-amber-500",
    professional: "text-emerald-500",
  };

  return (
    <div className="min-h-screen dotted-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={() => router.push("/")}
            className="hover:opacity-80 transition-opacity cursor-pointer"
          >
            <h1 className="text-8xl text-rose-600 advine-pixel-font leading-none">
              Cuepid
            </h1>
          </button>
          <div className="flex items-center gap-4">
            {user && (
              <div className="bg-white/80 rounded-full px-4 py-2 shadow-sm text-sm">
                <span className="font-semibold text-gray-700">
                  Lv. {user.level}
                </span>
                <span className="text-rose-400 ml-2">{user.xp} XP</span>
              </div>
            )}
            <button
              onClick={() => router.push("/profile")}
              className="bg-white/80 hover:bg-white rounded-full px-4 py-2 shadow-sm text-sm text-gray-600 hover:text-rose-500 transition-colors"
            >
              Profile
            </button>
          </div>
        </div>

        {/* Global Mode & Difficulty Toggle */}
        <div className="mb-8 bg-white rounded-2xl shadow-md p-5 flex flex-wrap gap-6 items-center">
          {/* Mode Toggle */}
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium text-gray-700 min-w-fit">Mode:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setGlobalMode("text")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  globalMode === "text"
                    ? "bg-rose-500 text-white shadow-lg scale-105"
                    : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                }`}
              >
                💬 Text
              </button>
              <button
                onClick={() => setGlobalMode("voice")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  globalMode === "voice"
                    ? "bg-rose-500 text-white shadow-lg scale-105"
                    : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                }`}
              >
                🎤 Voice
              </button>
            </div>
          </div>

          {/* Difficulty Toggle */}
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium text-gray-700 min-w-fit">Difficulty:</span>
            <div className="flex gap-2">
              {(["easy", "medium", "hard"] as const).map((diff) => {
                const userLevel = user?.level ?? 1;
                const locked =
                  (diff === "medium" && userLevel < 2) ||
                  (diff === "hard" && userLevel < 4);
                return (
                  <button
                    key={diff}
                    onClick={() => !locked && setGlobalDifficulty(diff)}
                    disabled={locked}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      globalDifficulty === diff
                        ? "bg-rose-500 text-white shadow-lg scale-105"
                        : locked
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                          : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                    }`}
                  >
                    {locked ? "🔒" : diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Partner Gender Toggle */}
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium text-gray-700 min-w-fit">Partner:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPartnerGender("female")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  partnerGender === "female"
                    ? "bg-rose-500 text-white shadow-lg scale-105"
                    : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                }`}
              >
                👩 Female
              </button>
              <button
                onClick={() => setPartnerGender("male")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  partnerGender === "male"
                    ? "bg-rose-500 text-white shadow-lg scale-105"
                    : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                }`}
              >
                👨 Male
              </button>
            </div>
          </div>
        </div>

        {/* Scenario Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Object.values(scenarios).map((scenario) => {
            const locked = isScenarioLocked(scenario.id);
            return (
              <div
                key={scenario.id}
                className={`bg-white rounded-2xl shadow-md transition-shadow p-5 flex flex-col ${
                  locked ? "opacity-60" : "hover:shadow-lg"
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl">{scenario.icon}</span>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-gray-800 leading-tight">
                      {scenario.title.toUpperCase()}
                    </h2>
                    <span
                      className={`text-xs font-medium uppercase ${categoryColors[scenario.category] || "text-gray-400"}`}
                    >
                      {scenario.category}
                    </span>
                  </div>
                </div>

                <p className="text-gray-500 text-sm mb-4 flex-1">
                  {getScenarioDescription(scenario)}
                </p>

                {locked ? (
                  <button
                    disabled
                    className="w-full bg-gray-300 text-gray-500 py-2.5 rounded-xl font-medium cursor-not-allowed flex items-center justify-center gap-2"
                    title="Complete some conversations first to identify your weaknesses"
                  >
                    🔒 Locked
                  </button>
                ) : (
                  <button
                    onClick={() => startConversation(scenario.id)}
                    className="w-full bg-rose-500 text-white py-2.5 rounded-xl font-medium hover:bg-rose-600 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {globalMode === "voice" ? "🎤 Start Voice Chat" : "💬 Start Chat"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
