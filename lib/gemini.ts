import { GoogleGenerativeAI } from "@google/generative-ai";

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Please define GEMINI_API_KEY in .env.local");
  }
  return new GoogleGenerativeAI(apiKey);
}

export function getChatModel(systemPrompt: string) {
  return getGenAI().getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
  });
}

export function getAnalysisModel() {
  return getGenAI().getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });
}
