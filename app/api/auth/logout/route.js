import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 });
    }

    const db = await getDb();
    const sessions = db.collection("sessions");

    // Delete the session from database
    await sessions.deleteOne({ sessionId });

    return NextResponse.json({ ok: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("/api/auth/logout error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
