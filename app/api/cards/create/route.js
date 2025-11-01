import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const bank = typeof body.bank === "string" ? body.bank.trim() : "";
    const accountNumber = typeof body.accountNumber === "string" ? body.accountNumber : "";
    const cvv = typeof body.cvv === "number" ? body.cvv : 0;
    const expiryDate = typeof body.expiryDate === "string" ? body.expiryDate : "";
    const createdDate = typeof body.createdDate === "string" ? body.createdDate : "";
    const userId = typeof body.userId === "string" ? body.userId : "";
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";

    if (!name || !bank || !accountNumber || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = await getDb();
    const cards = db.collection("cards");

    // Check if this name already has a card for the same bank for this user
    const normalizedName = name.toLowerCase();
    const existingCard = await cards.findOne({ 
      normalizedName,
      bank,
      userId 
    });

    if (existingCard) {
      return NextResponse.json({ 
        error: `A card with the name "${name}" already exists for ${bank}. Please use a different name or select a different bank.` 
      }, { status: 409 });
    }

    // Create the card document
    const cardDoc = {
      name,
      normalizedName,
      bank,
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
        bank: cardDoc.bank,
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
