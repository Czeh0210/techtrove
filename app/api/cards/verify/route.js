import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

// Verify if a card exists in the database
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cardNumber = searchParams.get("cardNumber");
    const name = searchParams.get("name");

    if (!cardNumber) {
      return NextResponse.json(
        { error: "Card number is required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const cards = db.collection("cards");

    // Build query
    const query = { accountNumber: cardNumber };
    
    if (name) {
      query.normalizedName = name.toLowerCase().trim();
    }

    // Find card in database
    const card = await cards.findOne(query);

    if (!card) {
      return NextResponse.json({
        exists: false,
        message: name 
          ? "No card found with this number and name combination"
          : "No card found with this number"
      });
    }

    // Card exists - return limited info (don't expose sensitive data)
    return NextResponse.json({
      exists: true,
      card: {
        name: card.name,
        accountNumber: card.accountNumber,
        // Don't expose: userId, cvv, balance, etc.
      },
      message: "Card found in database"
    });

  } catch (error) {
    console.error("/api/cards/verify error:", error);
    return NextResponse.json(
      { error: "Server error verifying card" },
      { status: 500 }
    );
  }
}

// Search for cards by partial name (for autocomplete/suggestions)
export async function POST(request) {
  try {
    const body = await request.json();
    const { searchTerm, limit = 5 } = body;

    if (!searchTerm || searchTerm.length < 2) {
      return NextResponse.json({
        cards: [],
        message: "Search term must be at least 2 characters"
      });
    }

    const db = await getDb();
    const cards = db.collection("cards");

    // Search by name (case-insensitive, partial match)
    const regex = new RegExp(searchTerm, 'i');
    const foundCards = await cards
      .find({ name: regex })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      ok: true,
      count: foundCards.length,
      cards: foundCards.map(card => ({
        name: card.name,
        accountNumber: card.accountNumber,
        // Mask card number for privacy: 1234****5678
        maskedNumber: card.accountNumber.replace(/(\d{4})\d{8}(\d{4})/, '$1********$2')
      }))
    });

  } catch (error) {
    console.error("/api/cards/verify POST error:", error);
    return NextResponse.json(
      { error: "Server error searching cards" },
      { status: 500 }
    );
  }
}
