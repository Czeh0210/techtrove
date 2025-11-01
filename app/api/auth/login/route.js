import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export async function POST(request) {
  try {
    const body = await request.json();
    const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!emailRaw || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const email = emailRaw.toLowerCase();
    const db = await getDb();
    const users = db.collection("users");

    const user = await users.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Success. In a real app you'd set a session/JWT here.
    return NextResponse.json({ ok: true, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


