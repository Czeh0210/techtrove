import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const accountNumber = typeof body.accountNumber === "string" ? body.accountNumber : "";
    const cvv = typeof body.cvv === "number" ? body.cvv : 0;
    const expiryDate = typeof body.expiryDate === "string" ? body.expiryDate : "";
    const createdDate = typeof body.createdDate === "string" ? body.createdDate : "";
    const userId = typeof body.userId === "string" ? body.userId : "";
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";

    if (!name || !accountNumber || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = await getDb();
    const cards = db.collection("cards");

    // Check if this name already has a card for this user
    const normalizedName = name.toLowerCase();
    const existingCard = await cards.findOne({ 
      normalizedName,
      userId 
    });

    if (existingCard) {
      return NextResponse.json({ 
        error: "This name has already been registered. Each name can only create one card." 
      }, { status: 409 });
    }

    // Create the card document
    const cardDoc = {
      name,
      normalizedName,
      accountNumber,
      cvv,
      expiryDate,
      createdDate,
      userId,
      sessionId,
      createdAt: new Date(),
    };

    const result = await cards.insertOne(cardDoc);

    return NextResponse.json({
      ok: true,
      cardId: result.insertedId,
      card: {
        name: cardDoc.name,
        accountNumber: cardDoc.accountNumber,
        cvv: cardDoc.cvv,
        expiryDate: cardDoc.expiryDate,
        createdDate: cardDoc.createdDate,
      }
    }, { status: 201 });
  } catch (error) {
    console.error("/api/cards/create error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
