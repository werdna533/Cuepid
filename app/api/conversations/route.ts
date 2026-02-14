import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import Conversation from "@/lib/models/Conversation";

export async function POST(req: NextRequest) {
  try {
    const { userId, scenario, difficulty, messages, mode, voiceMetricsHistory } = await req.json();
    await dbConnect();

    const conversation = await Conversation.create({
      userId,
      scenario,
      difficulty,
      messages,
      mode: mode || "text",
      voiceMetricsHistory: voiceMetricsHistory || [],
    });

    return Response.json({ conversation });
  } catch (error) {
    console.error("Conversation API error:", error);
    return Response.json(
      { error: "Failed to save conversation" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return Response.json(
        { error: "userId required" },
        { status: 400 }
      );
    }

    await dbConnect();
    const conversations = await Conversation.find({ userId }).sort({
      createdAt: -1,
    });

    return Response.json({ conversations });
  } catch (error) {
    console.error("Conversation API error:", error);
    return Response.json(
      { error: "Failed to get conversations" },
      { status: 500 }
    );
  }
}
