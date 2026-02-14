import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";

export async function POST(req: NextRequest) {
  try {
    const { visitorId } = await req.json();
    await dbConnect();

    let user = await User.findOne({ visitorId });
    if (!user) {
      user = await User.create({ visitorId });
    }

    return Response.json({ user });
  } catch (error) {
    console.error("User API error:", error);
    return Response.json(
      { error: "Failed to get/create user" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const visitorId = req.nextUrl.searchParams.get("visitorId");
    if (!visitorId) {
      return Response.json(
        { error: "visitorId required" },
        { status: 400 }
      );
    }

    await dbConnect();
    const user = await User.findOne({ visitorId });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({ user });
  } catch (error) {
    console.error("User API error:", error);
    return Response.json(
      { error: "Failed to get user" },
      { status: 500 }
    );
  }
}
