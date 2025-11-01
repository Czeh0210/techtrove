import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get("cardId");

    if (!cardId) {
      return NextResponse.json({ error: "Missing cardId" }, { status: 400 });
    }

    const db = await getDb();
    const cards = db.collection("cards");

    // Delete the card
    const result = await cards.deleteOne({ _id: new ObjectId(cardId) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, message: "Card deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("/api/cards/delete error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
