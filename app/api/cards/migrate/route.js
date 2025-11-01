import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

// This endpoint will update all existing cards with balance field
export async function POST(request) {
  try {
    const db = await getDb();
    const cards = db.collection("cards");

    // Update all cards that don't have a balance field
    const result = await cards.updateMany(
      { balance: { $exists: false } }, // Find cards without balance field
      { 
        $set: { 
          balance: 1000,
          currency: "MYR",
          lastUpdated: new Date()
        } 
      }
    );

    return NextResponse.json({
      ok: true,
      message: "Migration completed successfully",
      cardsUpdated: result.modifiedCount,
      matchedCount: result.matchedCount
    });

  } catch (error) {
    console.error("/api/cards/migrate error:", error);
    return NextResponse.json({ error: "Server error during migration" }, { status: 500 });
  }
}

// GET endpoint to check how many cards need migration
export async function GET(request) {
  try {
    const db = await getDb();
    const cards = db.collection("cards");

    const cardsWithoutBalance = await cards.countDocuments({ 
      balance: { $exists: false } 
    });

    const cardsWithBalance = await cards.countDocuments({ 
      balance: { $exists: true } 
    });

    const allCards = await cards.find({}).toArray();

    return NextResponse.json({
      ok: true,
      totalCards: allCards.length,
      cardsWithoutBalance: cardsWithoutBalance,
      cardsWithBalance: cardsWithBalance,
      cards: allCards.map(card => ({
        name: card.name,
        accountNumber: card.accountNumber,
        balance: card.balance || "NOT SET",
        currency: card.currency || "NOT SET"
      }))
    });

  } catch (error) {
    console.error("/api/cards/migrate GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
