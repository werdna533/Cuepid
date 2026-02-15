"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import { scenarios } from "@/lib/scenarios";
import VoiceRecorder from "@/app/components/VoiceRecorder";
import AudioPlayer from "@/app/components/AudioPlayer";
import { VoiceMetrics } from "@/lib/voiceAnalytics";
import { EmotionalTone, PartnerGender } from "@/lib/toneToVoiceSettings";

interface VoiceMessage {
  role: "user" | "model";
  content: string;
  audioUrl?: string;
  voiceMetrics?: VoiceMetrics;
  tone?: EmotionalTone;
  timestamp: number;
}

type ConversationState = "idle" | "listening" | "processing" | "speaking";

export default function VoiceChatPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const scenarioId = params.scenarioId as string;
  const difficulty = parseInt(searchParams.get("difficulty") || "3");
  const gender = (searchParams.get("gender") || "female") as PartnerGender;
  const weaknesses = searchParams.get("weaknesses")?.split(",").filter(Boolean) || [];
  const scenario = scenarios[scenarioId];

  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [conversationState, setConversationState] = useState<ConversationState>("idle");
  const [currentDifficulty, setCurrentDifficulty] = useState(difficulty);
  const [voiceMetricsHistory, setVoiceMetricsHistory] = useState<VoiceMetrics[]>([]);
  const [userId, setUserId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [currentTone, setCurrentTone] = useState<EmotionalTone>("neutral");
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioUrlsRef = useRef<string[]>([]);

  // Cleanup audio URLs on unmount
  useEffect(() => {
    return () => {
      audioUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    const id = localStorage.getItem("cuepid-user-id") || "";
    setUserId(id);
  }, []);

  // Initialize with starter message
  useEffect(() => {
    if (scenario && messages.length === 0) {
      generateStarterMessage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const generateStarterMessage = async () => {
    if (!scenario) return;

    setConversationState("processing");
    setIsGeneratingAudio(true);

    try {
      // Generate TTS for starter message
      const ttsResponse = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: scenario.starterMessage,
          scenarioCategory: scenario.category,
          tone: "warm",
          gender,
        }),
      });

      if (!ttsResponse.ok) {
        const errText = await ttsResponse.text();
        console.error("TTS failed:", ttsResponse.status, errText);
        throw new Error("TTS failed: " + errText);
      }

      const audioBlob = await ttsResponse.blob();
      
      // Validate blob
      if (!audioBlob.size || !audioBlob.type.includes("audio")) {
        console.error("Invalid audio blob received:", audioBlob.type, audioBlob.size);
        throw new Error("Invalid audio response");
      }
      
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlsRef.current.push(audioUrl);

      const starterMessage: VoiceMessage = {
        role: "model",
        content: scenario.starterMessage,
        audioUrl,
        tone: "warm",
        timestamp: Date.now(),
      };

      setMessages([starterMessage]);
      setCurrentAudioUrl(audioUrl);
      setConversationState("speaking");
      setIsGeneratingAudio(false);
    } catch (error) {
      console.error("Failed to generate starter message:", error);
      // Fallback to text-only
      setMessages([
        {
          role: "model",
          content: scenario.starterMessage,
          tone: "warm",
          timestamp: Date.now(),
        },
      ]);
      setConversationState("idle");
      setIsGeneratingAudio(false);
    }
  };

  // Helper function to detect non-speech audio patterns
  const isNonSpeechAudio = (transcript: string): boolean => {
    const nonSpeechPatterns = [
      // English patterns
      /\(.*whoosh.*\)/i,
      /\(.*background\s+music.*\)/i,
      /\(.*background\s+noise.*\)/i,
      /\(.*ambient.*noise.*\)/i,
      /\(.*silence.*\)/i,
      /\(.*static.*\)/i,
      /\(.*wind.*noise.*\)/i,
      /\(.*breathing.*\)/i,
      /\(.*rustling.*\)/i,
      /\(.*clicking.*\)/i,
      /\(.*tapping.*\)/i,
      /\(.*keyboard.*\)/i,
      /\(.*mouse.*click.*\)/i,
      /\(.*fan.*noise.*\)/i,
      /\(.*air.*conditioning.*\)/i,
      /\(.*traffic.*\)/i,
      /\(.*footsteps.*\)/i,
      /\(.*door.*\)/i,
      /\(.*phone.*\)/i,
      /\(.*notification.*\)/i,
      /\(.*beep.*\)/i,
      /\(.*buzz.*\)/i,
      /\(.*hum.*\)/i,
      /\(.*sound.*\)/i,
      /\(.*noise.*\)/i,
      /\(.*audio.*\)/i,
      /\(.*music.*\)/i,
      
      // Korean patterns (배경 소음 = background noise)
      /\(.*배경.*소음.*\)/,
      /\(.*소음.*\)/,
      /\(.*잡음.*\)/,
      /\(.*바람.*소리.*\)/,
      /\(.*음악.*\)/,
      /\(.*소리.*\)/,
      
      // Chinese patterns (背景噪音 = background noise)
      /\(.*背景.*噪音.*\)/,
      /\(.*背景.*音乐.*\)/,
      /\(.*噪音.*\)/,
      /\(.*杂音.*\)/,
      /\(.*声音.*\)/,
      /\(.*音乐.*\)/,
      /\(.*风声.*\)/,
      
      // Japanese patterns
      /\(.*背景.*ノイズ.*\)/,
      /\(.*雑音.*\)/,
      /\(.*音楽.*\)/,
      /\(.*音.*\)/,
      
      // Spanish patterns
      /\(.*ruido.*de.*fondo.*\)/i,
      /\(.*ruido.*\)/i,
      /\(.*sonido.*\)/i,
      /\(.*música.*\)/i,
      
      // French patterns
      /\(.*bruit.*de.*fond.*\)/i,
      /\(.*bruit.*\)/i,
      /\(.*musique.*\)/i,
      /\(.*son.*\)/i,
      
      // German patterns
      /\(.*hintergrund.*geräusch.*\)/i,
      /\(.*geräusch.*\)/i,
      /\(.*musik.*\)/i,
      
      // Square bracket variations
      /\[.*sound.*\]/i,
      /\[.*noise.*\]/i,
      /\[.*music.*\]/i,
      /\[.*소음.*\]/,
      /\[.*噪音.*\]/,
      
      // Generic patterns that work across languages
      /^\(.*\)$/,  // Anything entirely in parentheses
      /^\[.*\]$/,  // Anything entirely in square brackets
      
      // Very short or repetitive content that's likely not speech
      /^[a-z]{1,2}\.?$/i,
      /^(ah+|uh+|mm+|hm+)\.?$/i,
      /^[^\p{L}\p{N}]*$/u, // Only symbols/punctuation, no letters or numbers
    ];

    const trimmedTranscript = transcript.trim();
    
    // Check if transcript is too short to be meaningful speech
    if (trimmedTranscript.length < 3) {
      return true;
    }
    
    // Check if it's only punctuation or symbols
    if (!/\p{L}/u.test(trimmedTranscript)) {
      return true;
    }
    
    // Check against known non-speech patterns
    const isNonSpeech = nonSpeechPatterns.some(pattern => pattern.test(transcript));
    
    // Add debug logging to track filtering behavior
    if (isNonSpeech) {
      console.log('[Voice Filter] Blocked non-speech audio:', transcript);
    }
    
    return isNonSpeech;
  };

  const handleRecordingComplete = async (audioBlob: Blob, durationMs: number) => {
    setConversationState("processing");

    try {
      // Step 1: Transcribe the audio
      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("durationMs", durationMs.toString());

      const transcribeResponse = await fetch("/api/voice/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!transcribeResponse.ok) throw new Error("Transcription failed");

      const transcribeData = await transcribeResponse.json();
      const { transcript, words: wordTimestamps } = transcribeData;

      if (!transcript || transcript.trim().length === 0) {
        alert("Could not understand audio. Please try again.");
        setConversationState("idle");
        return;
      }

      // Check for non-speech audio patterns
      if (isNonSpeechAudio(transcript)) {
        console.log("Non-speech audio detected:", transcript);
        alert("I detected background noise instead of speech. Please try speaking again.");
        setConversationState("idle");
        return;
      }

      // Add user message
      const userMessage: VoiceMessage = {
        role: "user",
        content: transcript,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Step 2: Get voice chat response with analysis
      const voiceChatResponse = await fetch("/api/voice/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          transcriptDurationMs: durationMs,
          wordTimestamps,
          scenarioId,
          difficulty: currentDifficulty,
          conversationHistory: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
            voiceMetrics: m.voiceMetrics,
            tone: m.tone,
          })),
          voiceMetricsHistory,
          desiredTone: currentTone,
          gender,
          userWeaknesses: weaknesses,
        }),
      });

      if (!voiceChatResponse.ok) throw new Error("Chat response failed");

      const chatData = await voiceChatResponse.json();
      const {
        reply,
        tone,
        newDifficulty,
        voiceMetrics,
      } = chatData;

      // Update user message with voice metrics
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          voiceMetrics,
        };
        return updated;
      });

      // Update metrics history
      setVoiceMetricsHistory((prev) => [...prev, voiceMetrics]);
      setCurrentDifficulty(newDifficulty);
      setCurrentTone(tone);

      // Step 3: Generate TTS for response
      setIsGeneratingAudio(true);
      const ttsResponse = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: reply,
          scenarioCategory: scenario?.category,
          tone,
          difficulty: newDifficulty,
          gender,
        }),
      });

      let modelAudioUrl: string | undefined;
      if (ttsResponse.ok) {
        const audioBlob = await ttsResponse.blob();
        // Validate that we got actual audio data, not an error response
        if (audioBlob.size > 0 && audioBlob.type.includes("audio")) {
          modelAudioUrl = URL.createObjectURL(audioBlob);
          audioUrlsRef.current.push(modelAudioUrl);
        } else {
          console.warn("TTS returned invalid audio blob:", audioBlob.type, audioBlob.size);
        }
      } else {
        const errText = await ttsResponse.text();
        console.error("TTS failed:", ttsResponse.status, errText);
      }

      // Add model message
      const modelMessage: VoiceMessage = {
        role: "model",
        content: reply,
        audioUrl: modelAudioUrl,
        tone,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, modelMessage]);

      if (modelAudioUrl) {
        setCurrentAudioUrl(modelAudioUrl);
        setConversationState("speaking");
      } else {
        setConversationState("idle");
      }
      setIsGeneratingAudio(false);
    } catch (error) {
      console.error("Voice chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: "Sorry, something went wrong. Please try again.",
          timestamp: Date.now(),
        },
      ]);
      setConversationState("idle");
      setIsGeneratingAudio(false);
    }
  };

  const handleAudioPlayComplete = useCallback(() => {
    setConversationState("idle");
    setCurrentAudioUrl(null);
  }, []);

  const endConversation = async () => {
    if (messages.length < 3 || isSaving) return;

    setIsSaving(true);
    try {
      // Save conversation with voice metrics
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          scenario: scenarioId,
          difficulty: currentDifficulty.toString(),
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          })),
          mode: "voice",
          voiceMetricsHistory,
        }),
      });

      const { conversation } = await response.json();
      router.push(`/dashboard/voice?convoId=${conversation._id}`);
    } catch (error) {
      console.error("Error saving conversation:", error);
      setIsSaving(false);
    }
  };

  const getDifficultyLabel = (level: number) => {
    if (level <= 2) return "Very Easy";
    if (level <= 4) return "Easy";
    if (level <= 6) return "Medium";
    if (level <= 8) return "Hard";
    return "Very Hard";
  };

  const getToneEmoji = (tone: EmotionalTone | undefined) => {
    const emojiMap: Record<string, string> = {
      romantic: "💕",
      playful: "😄",
      warm: "🌟",
      shy: "😊",
      confused: "🤔",
      annoyed: "😤",
      cold: "❄️",
      distant: "🌙",
      sarcastic: "😏",
      nervous: "😰",
      excited: "🎉",
      sad: "😢",
      angry: "😠",
      neutral: "😐",
      flirty: "😘",
      supportive: "🤗",
      defensive: "🛡️",
      hurt: "💔",
    };
    return emojiMap[tone || "neutral"] || "😐";
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
            ←
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
              {scenario.title}
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-400">
                🎤 Voice Mode
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-400">
                {getDifficultyLabel(currentDifficulty)} (Lv {currentDifficulty.toFixed(1)})
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={endConversation}
          disabled={messages.length < 3 || isSaving}
          className="px-4 py-1.5 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Saving..." : "End & Analyze"}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "flex-col items-end" : "flex-row items-start gap-3"}`}
          >
            {/* AI Profile Picture */}
            {msg.role === "model" && (
              <div className="flex-shrink-0 self-end mb-1">
                <Image
                  src="/scenarios/profile.png"
                  alt="AI Assistant"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              </div>
            )}
            
            <div className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
              {/* Tone indicator for model messages */}
              {msg.role === "model" && msg.tone && (
                <span className="text-xs text-gray-400 mb-1 ml-1">
                  {getToneEmoji(msg.tone)} {msg.tone}
                </span>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] ${
                  msg.role === "user"
                    ? "bg-rose-500 text-white rounded-2xl rounded-br-md"
                    : "bg-white text-gray-800 shadow-sm border border-rose-100 rounded-2xl rounded-bl-md"
                } px-4 py-3`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </p>
              </div>

              {/* Voice metrics summary for user messages */}
              {msg.role === "user" && msg.voiceMetrics && (
                <div className="flex gap-2 mt-1 text-xs text-gray-400">
                  <span>{msg.voiceMetrics.wpm} WPM</span>
                  <span>•</span>
                  <span>Confidence: {msg.voiceMetrics.confidenceScore}%</span>
                  {msg.voiceMetrics.fillerFrequency > 5 && (
                    <>
                      <span>•</span>
                      <span className="text-amber-500">
                        {msg.voiceMetrics.fillerFrequency}% fillers
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Controls */}
      <div className="bg-white/90 backdrop-blur-sm border-t border-rose-100 px-4 py-6 shrink-0">
        {/* State indicator */}
        <div className="text-center mb-4">
          {conversationState === "speaking" && (
            <div className="flex items-center justify-center gap-2 text-rose-500">
              <div className="flex gap-0.5 items-end h-5">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-rose-500 rounded-full animate-pulse"
                    style={{
                      height: `${8 + (i % 2) * 8}px`,
                      animationDelay: `${i * 100}ms`,
                    }}
                  />
                ))}
              </div>
              <span className="text-sm font-medium">Partner is speaking...</span>
            </div>
          )}
          {conversationState === "processing" && (
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <Image
                src="/scenarios/favicon.png"
                alt="Processing"
                width={16}
                height={16}
                className="animate-spin"
              />
              <span className="text-sm">
                {isGeneratingAudio ? "Generating response..." : "Processing..."}
              </span>
            </div>
          )}
          {conversationState === "listening" && (
            <div className="flex items-center justify-center gap-2 text-rose-500">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Listening...</span>
            </div>
          )}
        </div>

        {/* Audio player for model responses */}
        {(conversationState === "speaking" && currentAudioUrl) && (
          <div className="mb-4 max-w-md mx-auto">
            <AudioPlayer
              audioUrl={currentAudioUrl}
              isLoading={false}
              onPlayComplete={handleAudioPlayComplete}
              autoPlay={true}
            />
          </div>
        )}
        {isGeneratingAudio && !currentAudioUrl && (
          <div className="mb-4 max-w-md mx-auto flex items-center justify-center gap-3 bg-rose-50 rounded-xl px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-rose-200 flex items-center justify-center">
              <Image
                src="/scenarios/favicon.png"
                alt="Generating audio"
                width={20}
                height={20}
                className="animate-spin"
              />
            </div>
            <span className="text-rose-600 text-sm font-medium">Generating audio...</span>
          </div>
        )}

        {/* Voice recorder */}
        {conversationState !== "speaking" && (
          <VoiceRecorder
            onRecordingComplete={handleRecordingComplete}
            isDisabled={conversationState !== "idle"}
          />
        )}
      </div>
    </div>
  );
}
