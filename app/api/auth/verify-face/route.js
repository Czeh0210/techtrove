import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return -1;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = Number(a[i]);
    const y = Number(b[i]);
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return -1;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function euclideanDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return Number.POSITIVE_INFINITY;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = Number(a[i]) - Number(b[i]);
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { sessionId, embedding } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    if (!Array.isArray(embedding) || embedding.length === 0) {
      return NextResponse.json({ error: "Missing face embedding" }, { status: 400 });
    }

    const db = await getDb();
    const sessions = db.collection("sessions");
    const users = db.collection("users");

    // Verify session exists and is valid
    const session = await sessions.findOne({ sessionId });
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Check if session expired
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    // Get user from session
    const user = await users.findOne({ _id: session.userId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has face embeddings
    if (!Array.isArray(user.faceEmbeddings) || user.faceEmbeddings.length === 0) {
      return NextResponse.json({ 
        error: "No face data registered. Please use password verification.", 
        valid: false 
      }, { status: 400 });
    }

    // Compare the captured embedding with stored embeddings
    const COSINE_THRESHOLD = 0.55; // Stricter for transfer verification
    const DISTANCE_THRESHOLD = 0.60; // Stricter for transfer verification

    let bestMatch = {
      similarity: -1,
      distance: Number.POSITIVE_INFINITY
    };

    for (const storedEmbedding of user.faceEmbeddings) {
      const similarity = cosineSimilarity(embedding, storedEmbedding);
      const distance = euclideanDistance(embedding, storedEmbedding);
      
      if (similarity > bestMatch.similarity) {
        bestMatch.similarity = similarity;
        bestMatch.distance = distance;
      }
    }

    console.log('Face verification:', {
      similarity: bestMatch.similarity,
      distance: bestMatch.distance,
      thresholds: { cos: COSINE_THRESHOLD, dist: DISTANCE_THRESHOLD }
    });

    // Check if face matches
    const isMatch = bestMatch.similarity >= COSINE_THRESHOLD && 
                    bestMatch.distance <= DISTANCE_THRESHOLD;

    if (isMatch) {
      return NextResponse.json({ 
        valid: true,
        similarity: bestMatch.similarity,
        distance: bestMatch.distance
      });
    } else {
      return NextResponse.json({ 
        error: "Face verification failed. Face does not match.", 
        valid: false,
        similarity: bestMatch.similarity,
        distance: bestMatch.distance,
        cosTh: COSINE_THRESHOLD,
        distTh: DISTANCE_THRESHOLD
      }, { status: 401 });
    }

  } catch (error) {
    console.error("Face verification error:", error);
    return NextResponse.json({ 
      error: "Face verification failed", 
      valid: false 
    }, { status: 500 });
  }
}
