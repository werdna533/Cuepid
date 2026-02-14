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

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    Record<string, string>
  >({});
  const [selectedMode, setSelectedMode] = useState<Record<string, ConversationMode>>({});

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
    const difficulty = selectedDifficulty[scenarioId] || "easy";
    const mode = selectedMode[scenarioId] || "text";
    
    if (mode === "voice") {
      // Convert difficulty name to number for voice mode
      const difficultyNum = difficulty === "easy" ? 3 : difficulty === "medium" ? 5 : 8;
      router.push(`/chat/${scenarioId}/voice?difficulty=${difficultyNum}`);
    } else {
      router.push(`/chat/${scenarioId}?difficulty=${difficulty}`);
    }
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
          <div>
            <h1 className="text-8xl text-rose-600 advine-pixel-font leading-none">
              Cuepid
            </h1>
          </div>
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

        {/* Scenario Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Object.values(scenarios).map((scenario) => (
            <div
              key={scenario.id}
              className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-5 flex flex-col"
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
                {scenario.description}
              </p>

              {/* Mode Selector */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() =>
                    setSelectedMode((prev) => ({
                      ...prev,
                      [scenario.id]: "text",
                    }))
                  }
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                    (selectedMode[scenario.id] || "text") === "text"
                      ? "bg-rose-500 text-white shadow-sm"
                      : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                  }`}
                >
                  💬 Text
                </button>
                <button
                  onClick={() =>
                    setSelectedMode((prev) => ({
                      ...prev,
                      [scenario.id]: "voice",
                    }))
                  }
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                    selectedMode[scenario.id] === "voice"
                      ? "bg-rose-500 text-white shadow-sm"
                      : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                  }`}
                >
                  🎤 Voice
                </button>
              </div>

              {/* Difficulty Selector */}
              <div className="flex gap-2 mb-3">
                {(["easy", "medium", "hard"] as const).map((diff) => {
                  const locked =
                    (diff === "medium" && (user?.level ?? 1) < 2) ||
                    (diff === "hard" && (user?.level ?? 1) < 4);
                  const selected =
                    (selectedDifficulty[scenario.id] || "easy") === diff;
                  return (
                    <button
                      key={diff}
                      onClick={() =>
                        !locked &&
                        setSelectedDifficulty((prev) => ({
                          ...prev,
                          [scenario.id]: diff,
                        }))
                      }
                      disabled={locked}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        selected
                          ? "bg-rose-500 text-white shadow-sm"
                          : locked
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                      }`}
                    >
                      {locked ? "🔒 " : ""}
                      {diff.charAt(0).toUpperCase() + diff.slice(1)}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => startConversation(scenario.id)}
                className="w-full bg-rose-500 text-white py-2.5 rounded-xl font-medium hover:bg-rose-600 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {selectedMode[scenario.id] === "voice" ? "🎤 Start Voice Chat" : "💬 Start Chat"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
