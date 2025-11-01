import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const cardId = searchParams.get("cardId");

    if (!userId) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    const db = await getDb();
    const cards = db.collection("cards");

    if (cardId) {
      // Get specific card balance
      const card = await cards.findOne({ 
        userId, 
        accountNumber: cardId 
      });

      if (!card) {
        return NextResponse.json({ error: "Card not found" }, { status: 404 });
      }

      return NextResponse.json({
        ok: true,
        balance: card.balance || 1000,
        currency: card.currency || "MYR",
        cardNumber: card.accountNumber,
        cardName: card.name
      });
    } else {
      // Get total balance across all cards
      const userCards = await cards.find({ userId }).toArray();
      
      const totalBalance = userCards.reduce((sum, card) => {
        return sum + (card.balance || 1000);
      }, 0);

      return NextResponse.json({
        ok: true,
        totalBalance: totalBalance,
        cardCount: userCards.length,
        currency: "MYR",
        cards: userCards.map(card => ({
          accountNumber: card.accountNumber,
          name: card.name,
          balance: card.balance || 1000
        }))
      });
    }
  } catch (error) {
    console.error("/api/cards/balance error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, cardNumber, amount, operation } = body;

    if (!userId || !cardNumber || amount === undefined || !operation) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const cards = db.collection("cards");

    const card = await cards.findOne({ userId, accountNumber: cardNumber });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const currentBalance = card.balance || 1000;
    let newBalance;

    if (operation === "add") {
      newBalance = currentBalance + parseFloat(amount);
    } else if (operation === "subtract") {
      newBalance = currentBalance - parseFloat(amount);
      if (newBalance < 0) {
        return NextResponse.json(
          { error: "Insufficient balance" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Invalid operation. Use 'add' or 'subtract'" },
        { status: 400 }
      );
    }

    await cards.updateOne(
      { userId, accountNumber: cardNumber },
      { 
        $set: { 
          balance: newBalance,
          lastUpdated: new Date()
        } 
      }
    );

    return NextResponse.json({
      ok: true,
      previousBalance: currentBalance,
      newBalance: newBalance,
      currency: "MYR"
    });

  } catch (error) {
    console.error("/api/cards/balance POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
