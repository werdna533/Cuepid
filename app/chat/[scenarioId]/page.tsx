"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import { scenarios } from "@/lib/scenarios";

interface Message {
  role: "user" | "model";
  content: string;
  timestamp: number;
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const scenarioId = params.scenarioId as string;
  const difficulty = searchParams.get("difficulty") || "easy";
  const gender = searchParams.get("gender") || "female";
  const weaknesses = searchParams.get("weaknesses") || "";
  const scenario = scenarios[scenarioId];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [userId, setUserId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = localStorage.getItem("cuepid-user-id") || "";
    setUserId(id);

    if (scenario) {
      setMessages([
        {
          role: "model",
          content: scenario.starterMessage,
          timestamp: Date.now(),
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    // Add placeholder for AI response
    const aiPlaceholder: Message = {
      role: "model",
      content: "",
      timestamp: Date.now(),
    };
    setMessages([...newMessages, aiPlaceholder]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          scenarioId,
          difficulty,
          gender,
          weaknesses,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Chat request failed");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "model",
            content: fullText,
            timestamp: Date.now(),
          };
          return updated;
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "model",
          content: "Sorry, something went wrong. Please try again.",
          timestamp: Date.now(),
        };
        return updated;
      });
    }

    setIsStreaming(false);
    inputRef.current?.focus();
  }, [input, isStreaming, messages, scenarioId, difficulty]);

  const endConversation = async () => {
    if (messages.length < 3 || isSaving || isStreaming) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          scenario: scenarioId,
          difficulty,
          messages,
        }),
      });

      const { conversation } = await response.json();
      router.push(`/dashboard/${conversation._id}`);
    } catch (error) {
      console.error("Error saving conversation:", error);
      setIsSaving(false);
    }
  };

  if (!scenario) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Scenario not found</p>
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

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-rose-50 to-white">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-rose-100 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            {"\u2190"}
          </button>
          <div>
            <h1 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              {scenario.id === "planning_a_date" ? (
                <Image
                  src="/scenarios/planning_a_date.png"
                  alt={scenario.title}
                  width={20}
                  height={20}
                  className="rounded"
                />
              ) : scenario.id === "asking_someone_out" || scenario.id === "making_new_friends" ? (
                <Image
                  src={`/scenarios/${scenario.id}.png`}
                  alt={scenario.title}
                  width={20}
                  height={20}
                  className="rounded"
                />
              ) : scenario.id === "resolving_misunderstanding" ? (
                <Image
                  src="/scenarios/resolving_a_misunderstanding.png"
                  alt={scenario.title}
                  width={20}
                  height={20}
                  className="rounded"
                />
              ) : scenario.id === "difficult_conversation" ? (
                <Image
                  src="/scenarios/setting_boundaries.png"
                  alt={scenario.title}
                  width={20}
                  height={20}
                  className="rounded"
                />
              ) : scenario.id === "practice_weaknesses" ? (
                <Image
                  src="/scenarios/practice_your_weaknesses.png"
                  alt={scenario.title}
                  width={20}
                  height={20}
                  className="rounded"
                />
              ) : (
                <span>{scenario.icon}</span>
              )}
              {scenario.title.toUpperCase()}
            </h1>
            <span className="text-xs text-rose-400 capitalize">
              {difficulty} mode
            </span>
          </div>
        </div>
        <button
          onClick={endConversation}
          disabled={messages.length < 3 || isSaving || isStreaming}
          className="px-4 py-1.5 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Saving..." : "End & Analyze"}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3 chat-scroll">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl ${
                msg.role === "user"
                  ? "bg-rose-500 text-white rounded-br-md"
                  : "bg-white text-gray-800 shadow-sm border border-rose-100 rounded-bl-md"
              }`}
            >
              {msg.content ? (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </p>
              ) : (
                <div className="flex gap-1.5 py-1 px-1">
                  <span className="w-2 h-2 bg-rose-300 rounded-full bounce-dot-1" />
                  <span className="w-2 h-2 bg-rose-300 rounded-full bounce-dot-2" />
                  <span className="w-2 h-2 bg-rose-300 rounded-full bounce-dot-3" />
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white/90 backdrop-blur-sm border-t border-rose-100 px-4 py-3 shrink-0">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent placeholder-gray-400"
            disabled={isStreaming}
            autoFocus
          />
          <button
            onClick={sendMessage}
            disabled={isStreaming || !input.trim()}
            className="bg-rose-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-rose-600 transition-colors disabled:opacity-50 active:scale-95"
          >
            {"\u2191"}
          </button>
        </div>
      </div>
    </div>
  );
}
