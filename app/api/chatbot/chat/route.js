import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

console.log('OpenAI API Key loaded:', process.env.OPENAI_API_KEY ? 'Yes (length: ' + process.env.OPENAI_API_KEY.length + ')' : 'No');

export async function POST(request) {
  try {
    const body = await request.json();
    const { message, conversationHistory, userId, currentCard, userCards } = body;

    console.log('Chatbot API called with:', { message, userId, hasCard: !!currentCard, historyLength: conversationHistory?.length || 0 });

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Check if OpenAI API key exists
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // System prompt for banking assistant
    const systemPrompt = `You are a helpful, friendly, and conversational banking assistant for TechTrove Banking. Chat naturally like ChatGPT!

Current user context:
- User ID: ${userId || 'Not logged in'}
- Active Card: ${currentCard ? `${currentCard.name} (${currentCard.accountNumber || currentCard.cardNumber})` : 'None'}
- Card Balance: ${currentCard && currentCard.balance !== undefined ? `RM${currentCard.balance.toFixed(2)}` : 'N/A'}
- Total Cards: ${userCards ? userCards.length : 0}
${userCards && userCards.length > 0 ? `\nAll Cards:\n${userCards.map((c, i) => `${i + 1}. ${c.name} (${c.accountNumber}) - RM${(c.balance || 0).toFixed(2)}${currentCard?.accountNumber === c.accountNumber ? ' ⭐ (Active)' : ''}`).join('\n')}` : ''}

Your personality:
- Chat naturally and conversationally like a human
- Be warm, friendly, and helpful
- Use emojis naturally
- Remember context from previous messages in the conversation
- Ask follow-up questions when you need more information
- ONLY handle banking topics (transfers, balance, cards, transactions)
- Politely redirect non-banking questions back to banking

When to return JSON vs conversational text:

**Return JSON ONLY when you have COMPLETE information to execute an action:**

Balance check: {"action": "balance"}
View cards: {"action": "view_cards"}
Transaction history: {"action": "history"}
Transfer (ONLY with amount AND card number): {"action": "transfer", "amount": 100, "cardNumber": "1234567890123456"}

**Return conversational text for EVERYTHING ELSE:**
- Greetings and casual chat
- Questions about banking
- Transfer requests with missing info - ask conversationally for what's needed
- Examples: "I'd be happy to help! How much would you like to send?" or "Perfect! What's the recipient's card number?"

Examples of natural conversation:

User: "hello"
You: Hi there! 😊 I'm your TechTrove banking assistant. I can help you check your balance, view cards, see transaction history, or transfer money. What would you like to do?

User: "I want to send money"
You: I'd be happy to help you transfer money! 💸 How much would you like to send?

User: "50"
You: Perfect! RM50 it is. 💰 Could you provide the recipient's 16-digit card number?

User: "8032503758270773"
You: {"action": "transfer", "amount": 50, "cardNumber": "8032503758270773"}

User: "send RM100 to 1234567890123456"
You: {"action": "transfer", "amount": 100, "cardNumber": "1234567890123456"}

User: "what's 2+2?"
You: I'm specifically designed to help with banking! 🏦 I can assist with balance checks, viewing cards, transaction history, or transfers. What banking task can I help you with today?

Remember: Be conversational and natural! Only return JSON when you have complete info to execute an action.`;

    // Build messages array with conversation history
    const messages = [
      { role: "system", content: systemPrompt }
    ];

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    // Add current message
    messages.push({ role: "user", content: message });

    // Call OpenAI API
    console.log('Calling OpenAI API with', messages.length, 'messages...');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    console.log('OpenAI API response received');

    const aiMessage = completion.choices[0].message.content.trim();
    console.log('AI Message:', aiMessage);

    // Try to parse as JSON action
    try {
      const parsed = JSON.parse(aiMessage);
      if (parsed.action) {
        console.log('Action detected:', parsed.action);
        return NextResponse.json({ action: parsed });
      }
    } catch (e) {
      // Not JSON, it's a conversational response
      console.log('Conversational response detected');
    }

    // Return conversational response
    return NextResponse.json({ response: aiMessage });

  } catch (error) {
    console.error('Chatbot API Error:', error);
    
    // Handle specific OpenAI errors
    if (error.status === 401) {
      return NextResponse.json(
        { error: "Invalid API key", details: "The OpenAI API key is invalid or expired" },
        { status: 401 }
      );
    }
    
    if (error.status === 403) {
      return NextResponse.json(
        { error: "Access denied", details: "Your API key doesn't have access to the requested model" },
        { status: 403 }
      );
    }
    
    if (error.status === 429) {
      return NextResponse.json(
        { error: "Rate limit exceeded", details: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
