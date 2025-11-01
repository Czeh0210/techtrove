import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    const db = await getDb();
    const cards = db.collection("cards");

    // Fetch all cards for this user
    const userCards = await cards.find({ userId }).sort({ createdAt: -1 }).toArray();

    return NextResponse.json({
      ok: true,
      cards: userCards.map(card => ({
        id: card._id,
        name: card.name,
        accountNumber: card.accountNumber,
        cvv: card.cvv,
        expiryDate: card.expiryDate,
        createdDate: card.createdDate,
      }))
    });
  } catch (error) {
    console.error("/api/cards/list error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
