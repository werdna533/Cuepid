import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // Return hardcoded Gemini models list
    const availableModels = [
      {
        name: "models/gemini-2.0-flash",
        displayName: "Gemini 2.0 Flash",
        description: "Fast and versatile multimodal model",
        inputTokenLimit: 1048576,
        outputTokenLimit: 8192,
      },
      {
        name: "models/gemini-1.5-pro",
        displayName: "Gemini 1.5 Pro",
        description: "Advanced multimodal model with extensive reasoning",
        inputTokenLimit: 2097152,
        outputTokenLimit: 8192,
      },
      {
        name: "models/gemini-1.5-flash",
        displayName: "Gemini 1.5 Flash",
        description: "Fast and efficient multimodal model",
        inputTokenLimit: 1048576,
        outputTokenLimit: 8192,
      },
    ];

    return Response.json({
      models: availableModels,
      count: availableModels.length,
    });
  } catch (error) {
    console.error("Error listing models:", error);
    return Response.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}
