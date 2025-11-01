import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const { sessionId, password } = body;

    if (!sessionId || !password) {
      return NextResponse.json(
        { error: "Missing sessionId or password", valid: false },
        { status: 400 }
      );
    }

    const db = await getDb();
    const sessions = db.collection("sessions");
    const users = db.collection("users");

    // Find the session
    const session = await sessions.findOne({ sessionId });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found", valid: false },
        { status: 404 }
      );
    }

    // Check if session has expired
    if (new Date() > new Date(session.expiresAt)) {
      await sessions.deleteOne({ sessionId });
      return NextResponse.json(
        { error: "Session expired", valid: false },
        { status: 401 }
      );
    }

    // Find the user
    const user = await users.findOne({ _id: session.userId });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", valid: false },
        { status: 404 }
      );
    }

    // Verify password against the same hash used during login
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Incorrect password", valid: false },
        { status: 401 }
      );
    }

    // Password is correct
    return NextResponse.json({
      valid: true,
      message: "Password verified successfully"
    });
  } catch (error) {
    console.error("/api/auth/verify-password error:", error);
    return NextResponse.json(
      { error: "Server error", valid: false },
      { status: 500 }
    );
  }
}
