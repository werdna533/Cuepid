"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface AudioPlayerProps {
  audioUrl: string | null;
  isLoading?: boolean;
  onPlayComplete?: () => void;
  autoPlay?: boolean;
}

type PlayState = "idle" | "loading" | "playing" | "paused";

export default function AudioPlayer({
  audioUrl,
  isLoading = false,
  onPlayComplete,
  autoPlay = true,
}: AudioPlayerProps) {
  const [playState, setPlayState] = useState<PlayState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Validate audioUrl - must be non-empty string starting with blob: or http
    if (!audioUrl || audioUrl.trim() === "" || (!audioUrl.startsWith("blob:") && !audioUrl.startsWith("http"))) {
      setPlayState("idle");
      return;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setPlayState("loading");

    audio.onloadedmetadata = () => {
      if (autoPlay) {
        audio.play().catch(console.error);
      } else {
        setPlayState("paused");
      }
    };

    audio.onplay = () => {
      setPlayState("playing");
    };

    audio.onpause = () => {
      setPlayState("paused");
    };

    audio.onended = () => {
      setPlayState("idle");
      onPlayComplete?.();
    };

    audio.onerror = (e) => {
      setPlayState("idle");
      const err = audio.error;
      console.error("Audio playback error:", err?.code, err?.message);
      // Common error codes: 1=ABORTED, 2=NETWORK, 3=DECODE, 4=SRC_NOT_SUPPORTED
    };

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [audioUrl, autoPlay, onPlayComplete]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (playState === "playing") {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 bg-rose-50 rounded-xl px-4 py-3">
        <div className="w-10 h-10 rounded-full bg-rose-200 flex items-center justify-center">
          <Image
            src="/scenarios/favicon.png"
            alt="Loading"
            width={20}
            height={20}
            className="animate-spin"
          />
        </div>
        <div className="flex-1">
          <div className="flex gap-1">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="w-1 h-4 bg-rose-300 rounded-full animate-pulse"
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
          <p className="text-xs text-rose-400 mt-1">Generating response...</p>
        </div>
      </div>
    );
  }

  if (!audioUrl) return null;

  return (
    <div className="flex items-center gap-3 bg-rose-50 rounded-xl px-4 py-3">
      {/* Play/Pause button */}
      <button
        onClick={togglePlayPause}
        className="w-10 h-10 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-colors flex-shrink-0"
      >
        {playState === "loading" ? (
          <Image
            src="/scenarios/favicon.png"
            alt="Loading"
            width={20}
            height={20}
            className="animate-spin"
          />
        ) : playState === "playing" ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Static waveform visualization */}
      <div className="flex-1 flex items-center justify-center gap-1">
        {playState === "playing" ? (
          <>
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-rose-500 rounded-full animate-pulse"
                style={{
                  height: `${12 + Math.sin(i * 0.8) * 8}px`,
                  animationDelay: `${i * 80}ms`,
                }}
              />
            ))}
            <span className="ml-3 text-sm text-rose-600 font-medium">Playing...</span>
          </>
        ) : (
          <>
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-rose-300 rounded-full"
                style={{ height: `${12 + Math.sin(i * 0.8) * 8}px` }}
              />
            ))}
            <span className="ml-3 text-sm text-rose-400">Tap to play</span>
          </>
        )}
      </div>
    </div>
  );
}
