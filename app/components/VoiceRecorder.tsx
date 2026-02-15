"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, durationMs: number) => void;
  isDisabled?: boolean;
  maxDurationMs?: number;
}

type RecordingState = "idle" | "recording" | "processing";

export default function VoiceRecorder({
  onRecordingComplete,
  isDisabled = false,
  maxDurationMs = 60000, // 1 minute max
}: VoiceRecorderProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(50).fill(0));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Waveform visualization
  const updateWaveform = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average level
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    setAudioLevel(average / 255);

    // Sample data for waveform display
    const sampledData: number[] = [];
    const step = Math.floor(dataArray.length / 50);
    for (let i = 0; i < 50; i++) {
      sampledData.push(dataArray[i * step] / 255);
    }
    setWaveformData(sampledData);

    // Draw to canvas if available
    if (canvasRef.current) {
      drawWaveform(canvasRef.current, sampledData);
    }

    animationRef.current = requestAnimationFrame(updateWaveform);
  }, []);

  const drawWaveform = (canvas: HTMLCanvasElement, data: number[]) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const barWidth = width / data.length - 2;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    data.forEach((value, index) => {
      const barHeight = value * height * 0.8;
      const x = index * (barWidth + 2);

      // Gradient from rose to pink
      const gradient = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2);
      gradient.addColorStop(0, "#f43f5e");
      gradient.addColorStop(1, "#ec4899");

      ctx.fillStyle = gradient;
      ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight);
    });
  };

  const startRecording = async () => {
    try {
      // Check if running in a secure context
      if (!window.isSecureContext) {
        alert("Microphone access requires HTTPS. Please use localhost or enable HTTPS.");
        return;
      }

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Your browser does not support audio recording. Please try a modern browser like Chrome or Firefox.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;

      // Set up audio analysis
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const durationMs = Date.now() - startTimeRef.current;
        const audioBlob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType,
        });
        setRecordingState("processing");
        onRecordingComplete(audioBlob, durationMs);
        setRecordingState("idle");
        setRecordingTime(0);
        setWaveformData(new Array(50).fill(0));
        cleanup();
      };

      mediaRecorder.start(100); // Collect data every 100ms
      startTimeRef.current = Date.now();
      setRecordingState("recording");

      // Start timer
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setRecordingTime(elapsed);

        // Auto-stop at max duration
        if (elapsed >= maxDurationMs) {
          stopRecording();
        }
      }, 100);

      // Start waveform animation
      updateWaveform();
    } catch (error) {
      console.error("Failed to start recording:", error);
      const err = error as Error;
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        alert("Microphone access was denied. Please allow microphone access in your browser settings and reload the page.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        alert("No microphone found. Please connect a microphone and try again.");
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        alert("Could not access your microphone. It may be in use by another application.");
      } else {
        alert("Could not access microphone: " + err.message);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Waveform visualization */}
      <div className="w-full max-w-md h-20 bg-rose-50 rounded-xl overflow-hidden relative">
        {recordingState === "recording" ? (
          <canvas
            ref={canvasRef}
            width={400}
            height={80}
            className="w-full h-full"
          />
        ) : (
          <div className="flex items-center justify-center h-full gap-1">
            {waveformData.map((_, index) => (
              <div
                key={index}
                className="w-1 bg-rose-200 rounded-full transition-all duration-150"
                style={{
                  height: recordingState === "idle" ? "4px" : `${4 + waveformData[index] * 60}px`,
                }}
              />
            ))}
          </div>
        )}

        {/* Recording indicator */}
        {recordingState === "recording" && (
          <div className="absolute top-2 left-2 flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-red-500 font-medium">
              {formatTime(recordingTime)}
            </span>
          </div>
        )}
      </div>

      {/* Audio level meter */}
      {recordingState === "recording" && (
        <div className="w-full max-w-md h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all duration-75"
            style={{ width: `${audioLevel * 100}%` }}
          />
        </div>
      )}

      {/* Record button */}
      <button
        onClick={recordingState === "recording" ? stopRecording : startRecording}
        disabled={isDisabled || recordingState === "processing"}
        className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${
          recordingState === "recording"
            ? "bg-red-500 hover:bg-red-600 scale-110"
            : "bg-rose-500 hover:bg-rose-600"
        } disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-95`}
      >
        {recordingState === "recording" ? (
          // Stop icon
          <div className="w-7 h-7 bg-white rounded-sm" />
        ) : recordingState === "processing" ? (
          // Loading spinner
          <Image
            src="/scenarios/favicon.png"
            alt="Loading"
            width={32}
            height={32}
            className="animate-spin"
          />
        ) : (
          // Microphone icon
          <svg
            className="w-10 h-10 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}

        {/* Pulse animation when recording */}
        {recordingState === "recording" && (
          <>
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
            <span className="absolute inset-0 rounded-full bg-red-500 animate-pulse opacity-20" />
          </>
        )}
      </button>

      {/* Instructions */}
      <p className="text-sm text-gray-500 text-center">
        {recordingState === "idle" && "Tap to start speaking"}
        {recordingState === "recording" && "Tap to stop recording"}
        {recordingState === "processing" && "Processing..."}
      </p>
    </div>
  );
}
