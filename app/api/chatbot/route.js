import { NextResponse } from 'next/server';
import { userFromToken, getTransactionsForUser, calculateBalance, createTransaction, transferMoney } from '../../../lib/data-mongo';

export async function POST(req) {
  try {
    const auth = req.headers.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    const token = m[1];
    const user = await userFromToken(token);
    if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await req.json();
    const { message, conversationHistory = [] } = body;

    console.log('📩 Chatbot request from user:', user.username, '| Message:', message);

    // Gather user context: balance and recent transactions
    const balance = await calculateBalance(user.id);
    const transactions = (await getTransactionsForUser(user.id, { period: 'month' })).slice(0, 5);

    const systemPrompt = `You are a helpful banking assistant for TechTrove Online Banking Platform. The user is ${user.username}.
Current balance: RM ${balance.toFixed(2)}.
Recent transactions (last 5 in the past month):
${transactions.map((t) => `- ${t.type}: RM ${t.amount.toFixed(2)} on ${new Date(t.timestamp).toLocaleDateString()} (${t.description})`).join('\n') || 'None'}

You can ONLY help the user with banking functions:
- Check their balance
- Review transactions (this week, month, year) - Show as text in chat
- Record transactions/payments (like buying coffee, groceries, bills, online shopping, etc.)
- Transfer money to other users
- Download statements (ONLY when user explicitly asks to "download" or "export")

CRITICAL: You are a BANKING ASSISTANT ONLY. You MUST NOT answer questions outside of banking functions.
If the user asks about anything else (e.g., general knowledge, weather, recipes, advice, jokes, stories, etc.), politely decline with a warm, friendly response like:
"Thank you for reaching out! I appreciate your question, but I'm specifically designed to assist with banking services only. I can help you with checking your balance, reviewing transactions, making payments, transferring money, or downloading statements. Is there anything related to your banking that I can help you with today? 😊"

Always be warm, respectful, and helpful in your tone, even when declining non-banking requests.

IMPORTANT: This is a CLOSED online banking system. Users can ONLY:
1. Make payments/purchases (spend from their existing balance)
2. Transfer money to other users (peer-to-peer)

Users CANNOT deposit new money or withdraw cash - the system only manages existing balances.

VIEWING TRANSACTION HISTORY:
When user asks to view/check/see their transaction history:
- Use the get_transactions function to fetch their transactions
- Display the transactions as formatted text in the chat
- Show details: date, type, amount, description, balance after
- Format nicely with bullet points or numbered list
- ONLY call generate_statement function if user explicitly asks to "download" or "export" the statement

For example, when user asks "show me my transactions":
1. Call get_transactions with appropriate period
2. Format and display the results in chat like:
   "Here are your recent transactions:
   
   📅 January 15, 2025
   • Transfer to demo2: -RM 500.00
     Note: Lunch money
     Balance: RM 1,500.00
   
   📅 January 14, 2025
   • Coffee purchase: -RM 15.00
     At: Starbucks
     Balance: RM 2,000.00"

IMPORTANT TRANSACTION FLOW:
For Transactions/Payments (coffee, groceries, bills, online shopping, etc.):
Step 1: When user mentions buying/paying for something, extract the amount
Step 2: Ask for transaction details if not provided (e.g., "What did you purchase?")
Step 3: After getting ALL details, show a clear summary in point form and ask for confirmation:
   "Please confirm the following transaction:
   
   • Amount: RM X
   • Payment details: [description]
   
   Do you want to proceed with this transaction?"
Step 4: Only after "yes" confirmation, call process_transaction function with type "transaction"
Step 5: After processing, ALWAYS provide a clear summary like:
   "✅ Transaction completed!
   • Amount: RM X
   • Payment details: [description]
   • Your new balance: RM Y"

For Transfers:
Step 1: When user wants to transfer money, ask for amount if not provided
Step 2: Ask for recipient username if not provided
Step 3: Ask for transfer description/note if not provided
Step 4: After getting ALL details, show a clear summary in point form and ask for confirmation:
   "Please confirm the following transfer:
   
   • Transfer to: [Recipient Name]
   • Amount: RM X
   • Payment details: [description]
   
   Do you want to proceed with this transfer?"
Step 5: Only after "yes" confirmation, call transfer_money function
Step 6: After successful transfer, ALWAYS provide a clear summary like:
   "✅ Money transfer successful!
   • Transferred to: [Recipient Name]
   • Amount: RM X
   • Payment details: [description]
   • Your new balance: RM Y"

If user asks to deposit or withdraw money, politely explain: "This is a closed banking system. You can only make payments or transfer money to other users. Deposits and withdrawals are not available."

Available users for transfer: demo, demo2

Currency: All amounts are in Malaysian Ringgit (RM).
Be concise, friendly, and accurate.`;

    const tools = [
      {
        type: 'function',
        function: {
          name: 'process_transaction',
          description: 'Process a transaction/payment (buying coffee, groceries, bills, etc.). This reduces the user balance.',
          parameters: {
            type: 'object',
            properties: {
              amount: {
                type: 'number',
                description: 'The amount to spend (positive number)'
              },
              type: {
                type: 'string',
                enum: ['transaction'],
                description: 'Type: transaction for purchases/payments (coffee, groceries, bills)'
              },
              description: {
                type: 'string',
                description: 'Brief description of the transaction (e.g., "Coffee at Starbucks", "Grocery shopping", "Electricity bill")'
              }
            },
            required: ['amount', 'type', 'description']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_transactions',
          description: 'Retrieve transaction history to display in chat (NOT for download). Use this when user wants to view/see/check their transactions.',
          parameters: {
            type: 'object',
            properties: {
              period: {
                type: 'string',
                enum: ['week', 'month', 'year', 'all'],
                description: 'The time period for transactions to retrieve'
              },
              type: {
                type: 'string',
                enum: ['all', 'transfer-in', 'transfer-out', 'transaction', 'cash-in'],
                description: 'Filter by transaction type: "all" for all transactions, "transfer-in" for received transfers, "transfer-out" for sent transfers, "transaction" for payments/purchases only'
              }
            },
            required: ['period']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'generate_statement',
          description: 'Generate and prepare a statement for DOWNLOAD ONLY. Use this ONLY when user explicitly asks to "download" or "export" their statement.',
          parameters: {
            type: 'object',
            properties: {
              period: {
                type: 'string',
                enum: ['week', 'month', 'year', 'all'],
                description: 'The time period for the statement'
              },
              type: {
                type: 'string',
                enum: ['all', 'transfer-in', 'transfer-out', 'transaction', 'cash-in'],
                description: 'Filter by transaction type: "all" for all transactions, "transfer-in" for received transfers, "transfer-out" for sent transfers, "transaction" for payments/purchases only'
              }
            },
            required: ['period']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'transfer_money',
          description: 'Transfer money from the current user to another user by username',
          parameters: {
            type: 'object',
            properties: {
              amount: {
                type: 'number',
                description: 'The amount to transfer (positive number)'
              },
              toUsername: {
                type: 'string',
                description: 'The username of the recipient (e.g., "demo", "demo2")'
              },
              description: {
                type: 'string',
                description: 'Note or description of the transfer (e.g., "Lunch money", "Birthday gift", "Rent payment")'
              }
            },
            required: ['amount', 'toUsername', 'description']
          }
        }
      }
    ];

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message },
    ];

    const openaiKey = process.env.OPENAI_API_KEY;
    console.log('🔑 API Key exists:', !!openaiKey, '| Length:', openaiKey?.length);
    
    if (!openaiKey) {
      console.error('❌ Missing OpenAI API key in environment');
      return NextResponse.json({ error: 'Server misconfiguration: missing OpenAI key' }, { status: 500 });
    }

    console.log('🌐 Calling OpenAI API...');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        tools,
        tool_choice: 'auto',
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    console.log('📡 OpenAI response status:', res.status, res.statusText);

    if (!res.ok) {
      const err = await res.text();
      console.error('❌ OpenAI error response:', err);
      return NextResponse.json({ error: 'ChatGPT API error', details: err }, { status: 500 });
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    
    // Check if ChatGPT wants to call a function
    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      console.log('🔧 Function call:', functionName, functionArgs);

      if (functionName === 'get_transactions') {
        // Retrieve transactions to display in chat
        const { period, type } = functionArgs;
        const filterType = type || 'all';
        console.log('📊 Fetching transactions for display:', period, 'type:', filterType);

        const txList = await getTransactionsForUser(user.id, { period });
        const filteredTxList = filterType === 'all' ? txList : txList.filter(t => t.type === filterType);

        // Format transactions for display
        const formattedTransactions = filteredTxList.map(tx => ({
          date: new Date(tx.timestamp).toLocaleDateString('en-MY', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          type: tx.type,
          amount: tx.amount,
          description: tx.description,
          balanceAfter: tx.balanceAfter
        }));

        // Send transactions back to ChatGPT for natural formatting
        const followUpMessages = [
          ...messages,
          choice.message,
          {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              success: true,
              count: filteredTxList.length,
              period: period,
              transactions: formattedTransactions,
              message: `Found ${filteredTxList.length} transactions for the ${period}`
            })
          }
        ];

        const followUpRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: followUpMessages,
            max_tokens: 800,
            temperature: 0.7,
          }),
        });

        if (followUpRes.ok) {
          const followUpData = await followUpRes.json();
          const reply = followUpData.choices?.[0]?.message?.content || 'Here are your transactions.';
          console.log('✅ ChatGPT reply with transactions');
          return NextResponse.json({ reply });
        }
      } else if (functionName === 'process_transaction') {
        // Execute the transaction
        const { amount, type, description } = functionArgs;
        const balanceBefore = await calculateBalance(user.id);
        const tx = await createTransaction(user.id, { amount, type, description });
        const balanceAfter = await calculateBalance(user.id);

        console.log('✅ Transaction created:', tx.id, type, amount, '| Balance:', balanceBefore, '->', balanceAfter);

        // Send the function result back to ChatGPT for a natural response
        const followUpMessages = [
          ...messages,
          choice.message, // Include the assistant's function call
          {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              success: true,
              transaction_id: tx.id,
              balance_before: balanceBefore,
              balance_after: balanceAfter,
              amount: amount,
              type: type,
              transaction: tx,
              message: `Transaction successful! Balance before: RM ${balanceBefore.toFixed(2)}, Balance after: RM ${balanceAfter.toFixed(2)}`
            })
          }
        ];

        const followUpRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: followUpMessages,
            max_tokens: 400,
            temperature: 0.7,
          }),
        });

        if (followUpRes.ok) {
          const followUpData = await followUpRes.json();
          const reply = followUpData.choices?.[0]?.message?.content || 'Transaction completed successfully!';
          console.log('✅ ChatGPT reply with transaction:', reply.substring(0, 100) + '...');
          return NextResponse.json({ reply, transaction: tx, new_balance: balanceAfter });
        }
      } else if (functionName === 'transfer_money') {
        // Process money transfer
        const { amount, toUsername, description } = functionArgs;
        console.log('💸 Transfer request:', amount, 'to', toUsername);

        try {
          const result = await transferMoney(user.id, toUsername, amount, description);
          const senderBalanceAfter = await calculateBalance(user.id);
          const recipientBalanceAfter = await calculateBalance(result.recipient.id);

          console.log('✅ Transfer completed:', result.senderTransaction.id, '| Sender balance:', senderBalanceAfter);

          // Send result back to ChatGPT
          const followUpMessages = [
            ...messages,
            choice.message,
            {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                success: true,
                transfer_id: result.senderTransaction.id,
                amount: amount,
                recipient: result.recipient.displayName || toUsername,
                sender_balance_after: senderBalanceAfter,
                recipient_balance_after: recipientBalanceAfter,
                message: `Transfer successful! You sent RM ${amount.toFixed(2)} to ${result.recipient.displayName || toUsername}. Your new balance: RM ${senderBalanceAfter.toFixed(2)}`
              })
            }
          ];

          const followUpRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: followUpMessages,
              max_tokens: 400,
              temperature: 0.7,
            }),
          });

          if (followUpRes.ok) {
            const followUpData = await followUpRes.json();
            const reply = followUpData.choices?.[0]?.message?.content || 'Transfer completed successfully!';
            console.log('✅ ChatGPT reply with transfer:', reply.substring(0, 100) + '...');
            return NextResponse.json({ reply, transaction: result.senderTransaction, new_balance: senderBalanceAfter });
          }
        } catch (error) {
          console.error('❌ Transfer error:', error.message);
          
          // Send error back to ChatGPT
          const errorMessages = [
            ...messages,
            choice.message,
            {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                success: false,
                error: error.message
              })
            }
          ];

          const errorRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: errorMessages,
              max_tokens: 400,
              temperature: 0.7,
            }),
          });

          if (errorRes.ok) {
            const errorData = await errorRes.json();
            const reply = errorData.choices?.[0]?.message?.content || error.message;
            return NextResponse.json({ reply });
          }
        }
      } else if (functionName === 'generate_statement') {
        // Generate statement
        const { period, type } = functionArgs;
        const filterType = type || 'all';
        console.log('📄 Generating statement for period:', period, 'type:', filterType);

        // Send confirmation back to ChatGPT
        const followUpMessages = [
          ...messages,
          choice.message,
          {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              success: true,
              period: period,
              type: filterType,
              message: `Statement for ${period} (${filterType === 'all' ? 'all transactions' : filterType}) is ready for download`
            })
          }
        ];

        const followUpRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: followUpMessages,
            max_tokens: 400,
            temperature: 0.7,
          }),
        });

        if (followUpRes.ok) {
          const followUpData = await followUpRes.json();
          const reply = followUpData.choices?.[0]?.message?.content || 'Your statement is ready!';
          console.log('✅ ChatGPT reply with statement:', reply.substring(0, 100) + '...');
          return NextResponse.json({ reply, statement: { period, type: filterType } });
        }
      }
    }

    const reply = choice?.message?.content || 'Sorry, I could not generate a response.';
    console.log('✅ ChatGPT reply:', reply.substring(0, 100) + '...');
    return NextResponse.json({ reply });
  } catch (err) {
    console.error('💥 Chatbot route error:', err);
    return NextResponse.json({ error: 'Bad request', details: err.message }, { status: 400 });
  }
}
