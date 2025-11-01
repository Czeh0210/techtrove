import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing user ID" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const transactions = db.collection("transactions");

    // Fetch transactions where user is either sender or recipient
    const userTransactions = await transactions
      .find({
        $or: [
          { senderUserId: userId },
          { recipientUserId: userId }
        ]
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    const formattedTransactions = userTransactions.map(tx => ({
      id: tx._id.toString(),
      senderUserId: tx.senderUserId,
      senderName: tx.senderName,
      senderCardNumber: tx.senderCardNumber,
      recipientUserId: tx.recipientUserId,
      recipientName: tx.recipientName,
      recipientCardNumber: tx.recipientCardNumber,
      amount: tx.amount,
      currency: tx.currency || "MYR",
      status: tx.status,
      timestamp: tx.timestamp,
      type: tx.type
    }));

    return NextResponse.json({
      ok: true,
      transactions: formattedTransactions,
      count: formattedTransactions.length
    });

  } catch (error) {
    console.error("/api/cards/transactions error:", error);
    return NextResponse.json(
      { error: "Server error fetching transaction history" },
      { status: 500 }
    );
  }
}
