import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const { senderUserId, senderCardNumber, recipientCardNumber, recipientName, amount } = body;

    // Validate inputs
    if (!senderUserId || !senderCardNumber || !recipientCardNumber || !recipientName || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const cards = db.collection("cards");
    const transactions = db.collection("transactions");

    // Find sender's card
    const senderCard = await cards.findOne({
      userId: senderUserId,
      accountNumber: senderCardNumber
    });

    if (!senderCard) {
      return NextResponse.json(
        { error: "Sender card not found" },
        { status: 404 }
      );
    }

    // Check sender's balance
    const senderBalance = senderCard.balance || 1000;
    if (senderBalance < amount) {
      return NextResponse.json(
        { error: `Insufficient funds. Available balance: RM${senderBalance.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Find recipient by card number - MUST exist in database
    const recipientCard = await cards.findOne({
      accountNumber: recipientCardNumber
    });

    if (!recipientCard) {
      return NextResponse.json(
        { 
          error: "Recipient card not found in our system. Please verify the card number is correct.",
          hint: "Please ensure the 16-digit card number is registered in our database."
        },
        { status: 404 }
      );
    }

    // Additional validation: Ensure recipient card is active and has required fields
    if (!recipientCard.userId || !recipientCard.name) {
      return NextResponse.json(
        { error: "Recipient card is invalid or incomplete. Cannot process transfer." },
        { status: 400 }
      );
    }

    // Prevent self-transfer
    if (senderCard.userId === recipientCard.userId && senderCard.accountNumber === recipientCard.accountNumber) {
      return NextResponse.json(
        { error: "Cannot transfer to the same card" },
        { status: 400 }
      );
    }

    // Calculate new balances
    const newSenderBalance = senderBalance - parseFloat(amount);
    const recipientBalance = recipientCard.balance || 1000;
    const newRecipientBalance = recipientBalance + parseFloat(amount);

    // Create transaction record
    const transaction = {
      senderUserId: senderCard.userId,
      senderName: senderCard.name,
      senderCardNumber: senderCardNumber,
      recipientUserId: recipientCard.userId,
      recipientName: recipientCard.name,
      recipientCardNumber: recipientCardNumber,
      amount: parseFloat(amount),
      currency: "MYR",
      status: "completed",
      timestamp: new Date(),
      type: "transfer"
    };

    // Perform the transfer (update both balances and create transaction)
    const transactionResult = await transactions.insertOne(transaction);

    // Update sender's balance
    await cards.updateOne(
      { userId: senderUserId, accountNumber: senderCardNumber },
      { 
        $set: { 
          balance: newSenderBalance,
          lastUpdated: new Date()
        } 
      }
    );

    // Update recipient's balance
    await cards.updateOne(
      { accountNumber: recipientCardNumber },
      { 
        $set: { 
          balance: newRecipientBalance,
          lastUpdated: new Date()
        } 
      }
    );

    return NextResponse.json({
      ok: true,
      transaction: {
        id: transactionResult.insertedId.toString(),
        senderName: transaction.senderName,
        recipientName: transaction.recipientName,
        amount: transaction.amount,
        timestamp: transaction.timestamp,
        status: transaction.status
      },
      newBalance: newSenderBalance,
      previousBalance: senderBalance
    }, { status: 200 });

  } catch (error) {
    console.error("/api/cards/transfer error:", error);
    return NextResponse.json(
      { error: "Server error processing transfer" },
      { status: 500 }
    );
  }
}
