import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

// Generate unique session ID
function generateSessionId() {
  return randomBytes(32).toString('hex');
}

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
    const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const embedding = Array.isArray(body.embedding) ? body.embedding : null;
    const method = body.method === "face" ? "face" : (body.method === "password" ? "password" : null);

    if (!emailRaw) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const email = emailRaw.toLowerCase();
    const db = await getDb();
    const users = db.collection("users");

    const user = await users.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Branch by method or inputs: password-only or face-only
    if ((method === "password") || (!method && password && !embedding)) {
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }
      
      const sessions = db.collection("sessions");
      
      // Check if user already has an active session
      let existingSession = await sessions.findOne({ 
        userId: user._id,
        expiresAt: { $gt: new Date() } // Not expired
      });
      
      let sessionId, loginTime;
      
      if (existingSession) {
        // Reuse existing session
        sessionId = existingSession.sessionId;
        loginTime = existingSession.loginTime;
        
        // Update login time and extend expiration
        await sessions.updateOne(
          { sessionId },
          { 
            $set: { 
              lastLoginTime: new Date(),
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Extend 24 hours
            } 
          }
        );
      } else {
        // Generate new session ID only if no active session exists
        sessionId = generateSessionId();
        loginTime = new Date();
        
        await sessions.insertOne({
          sessionId,
          userId: user._id,
          email: user.email,
          loginMethod: "password",
          loginTime,
          lastLoginTime: loginTime,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        });
      }
      
      return NextResponse.json({ 
        ok: true, 
        user: { id: user._id, name: user.name, email: user.email },
        sessionId,
        loginTime
      });
    }

    if ((method === "face") || (!method && embedding && !password)) {
      const storedEmbeddings = Array.isArray(user.faceEmbeddings)
        ? user.faceEmbeddings
        : (Array.isArray(user.faceEmbedding) ? [user.faceEmbedding] : []);
      if (!storedEmbeddings.length) {
        return NextResponse.json({ error: "Face data not available" }, { status: 409 });
      }
      if (!Array.isArray(embedding) || embedding.length !== storedEmbeddings[0].length) {
        return NextResponse.json({ error: "Invalid face embedding" }, { status: 400 });
      }

      const sims = storedEmbeddings.map((e) => cosineSimilarity(embedding, e));
      const dists = storedEmbeddings.map((e) => euclideanDistance(embedding, e));
      const maxSim = sims.reduce((a, b) => (a > b ? a : b), -1);
      const minDist = dists.reduce((a, b) => (a < b ? a : b), Number.POSITIVE_INFINITY);

      const cosTh = 0.90;
      const distTh = 0.50;
      console.log("/api/auth/login metrics:", { maxSim, minDist, cosTh, distTh, email });

      if (!(maxSim >= cosTh && minDist <= distTh)) {
        return NextResponse.json(
          { error: "Face verification failed", similarity: maxSim, distance: minDist, cosTh, distTh },
          { status: 401 }
        );
      }
      
      const sessions = db.collection("sessions");
      
      // Check if user already has an active session
      let existingSession = await sessions.findOne({ 
        userId: user._id,
        expiresAt: { $gt: new Date() } // Not expired
      });
      
      let sessionId, loginTime;
      
      if (existingSession) {
        // Reuse existing session
        sessionId = existingSession.sessionId;
        loginTime = existingSession.loginTime;
        
        // Update login time and extend expiration
        await sessions.updateOne(
          { sessionId },
          { 
            $set: { 
              lastLoginTime: new Date(),
              loginMethod: "face", // Update to latest login method
              faceMatchScore: { similarity: maxSim, distance: minDist },
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Extend 24 hours
            } 
          }
        );
      } else {
        // Generate new session ID only if no active session exists
        sessionId = generateSessionId();
        loginTime = new Date();
        
        await sessions.insertOne({
          sessionId,
          userId: user._id,
          email: user.email,
          loginMethod: "face",
          loginTime,
          lastLoginTime: loginTime,
          faceMatchScore: { similarity: maxSim, distance: minDist },
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        });
      }
      
      return NextResponse.json({ 
        ok: true, 
        user: { id: user._id, name: user.name, email: user.email }, 
        sessionId,
        loginTime,
        similarity: maxSim, 
        distance: minDist, 
        cosTh, 
        distTh 
      });
    }

    // Fallback: if both provided or neither matches method, prefer explicit method or require one
    return NextResponse.json({ error: "Specify login method and required fields" }, { status: 400 });
  } catch (error) {
    console.error("/api/auth/login error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


