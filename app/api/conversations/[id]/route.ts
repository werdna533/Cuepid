import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import Conversation from "@/lib/models/Conversation";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return Response.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return Response.json({ conversation });
  } catch (error) {
    console.error("Conversation API error:", error);
    return Response.json(
      { error: "Failed to get conversation" },
      { status: 500 }
    );
  }
}
