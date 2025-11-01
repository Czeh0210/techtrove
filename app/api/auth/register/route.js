import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const embedding = Array.isArray(body.embedding) ? body.embedding : null;
    const embeddings = Array.isArray(body.embeddings) ? body.embeddings : (embedding ? [embedding] : null);

    if (!name || !emailRaw || !password || !embeddings || embeddings.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const email = emailRaw.toLowerCase();
    const db = await getDb();
    const users = db.collection("users");

    const existing = await users.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userDoc = {
      name,
      email,
      passwordHash,
      faceEmbeddings: embeddings,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await users.insertOne(userDoc);

    return NextResponse.json({
      ok: true,
      userId: result.insertedId,
    }, { status: 201 });
  } catch (error) {
    console.error("/api/auth/register error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


