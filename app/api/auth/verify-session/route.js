import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID", valid: false }, { status: 400 });
    }

    const db = await getDb();
    const sessions = db.collection("sessions");

    // Find the session
    const session = await sessions.findOne({ sessionId });

    if (!session) {
      return NextResponse.json({ error: "Session not found", valid: false }, { status: 404 });
    }

    // Check if session has expired
    if (new Date() > new Date(session.expiresAt)) {
      // Delete expired session
      await sessions.deleteOne({ sessionId });
      return NextResponse.json({ error: "Session expired", valid: false }, { status: 401 });
    }

    // Extend session expiration on every verification (7 days from now)
    await sessions.updateOne(
      { sessionId },
      { 
        $set: { 
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        } 
      }
    );

    // Session is valid
    return NextResponse.json({ 
      valid: true, 
      session: {
        sessionId: session.sessionId,
        userId: session.userId,
        email: session.email,
        loginMethod: session.loginMethod,
        loginTime: session.loginTime,
      }
    });
  } catch (error) {
    console.error("/api/auth/verify-session error:", error);
    return NextResponse.json({ error: "Server error", valid: false }, { status: 500 });
  }
}
