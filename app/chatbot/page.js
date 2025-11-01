'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, CreditCard, ArrowRightLeft, Wallet } from 'lucide-react';
import Navigation from '@/components/Navigation';

export default function BankingChatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userCards, setUserCards] = useState([]);
  const [currentCard, setCurrentCard] = useState(null);
  const [transferState, setTransferState] = useState({
    active: false,
    step: null, // 'amount', 'card', 'confirm'
    amount: null,
    recipientCard: null,
    recipientName: null,
    bank: null
  });
  const [isClient, setIsClient] = useState(false);
  const messagesEndRef = useRef(null);

  // Load from localStorage on client side only
  useEffect(() => {
    setIsClient(true);
    
    try {
      const savedMessages = localStorage.getItem('chatHistory');
      const savedCard = localStorage.getItem('chatActiveCard');
      
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        const messagesWithDates = parsed.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(messagesWithDates);
        console.log('Chat history loaded:', messagesWithDates.length, 'messages');
      }
      
      if (savedCard) {
        const parsedCard = JSON.parse(savedCard);
        setCurrentCard(parsedCard);
        console.log('Saved card loaded:', parsedCard.name);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }, []);

  // Load chat history from localStorage
  useEffect(() => {
    // Check session after chat history is loaded
    checkSession();
  }, [isClient]);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0 && currentCard) {
      try {
        localStorage.setItem('chatHistory', JSON.stringify(messages));
        localStorage.setItem('chatActiveCard', JSON.stringify({
          accountNumber: currentCard.accountNumber,
          name: currentCard.name
        }));
      } catch (error) {
        console.error('Failed to save chat history:', error);
      }
    }
  }, [messages, currentCard]);

  // Get user session
  const checkSession = async () => {
    if (!isClient) return;
    
    try {
      // Try to get sessionId from localStorage
      const sessionId = localStorage.getItem('sessionId');
      
      if (!sessionId) {
        setMessages([{
          role: 'assistant',
          content: '👋 Welcome! I\'m your friendly banking assistant.\n\n🔐 To get started, please log in to access your cards and make transfers. I\'m here to help you manage your finances safely and easily!',
          timestamp: new Date()
        }]);
        return;
      }

      const res = await fetch('/api/auth/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      if (!res.ok) {
        setMessages([{
          role: 'assistant',
          content: '⏰ Hi there! It looks like your session has expired for security reasons.\n\nPlease log in again, and I\'ll be right here to assist you with your banking needs!',
          timestamp: new Date()
        }]);
        return;
      }

      const data = await res.json();
      if (data.valid && data.session?.userId) {
        setUserId(data.session.userId);
        await loadUserCards(data.session.userId);
      } else {
        setMessages([{
          role: 'assistant',
          content: '👋 Hello! I\'m here to help you with your banking needs.\n\n🔐 Please log in first so I can assist you with transfers, balance checks, and more!',
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Session check failed:', error);
      setMessages([{
        role: 'assistant',
        content: '😊 Hi! I\'m having a small technical difficulty verifying your session.\n\nCould you please try logging in again? I\'ll be ready to help you right away!',
        timestamp: new Date()
      }]);
    }
  };

  const loadUserCards = async (uid) => {
    try {
      const res = await fetch(`/api/cards/list?userId=${uid}`);
      const data = await res.json();
      if (data.ok && data.cards.length > 0) {
        setUserCards(data.cards);
        
        // Check if we already have a saved card and messages
        const hasSavedChat = messages.length > 0 && currentCard;
        
        if (hasSavedChat) {
          console.log('Using restored chat history for card:', currentCard.name);
          // Update the current card with fresh data (balance might have changed)
          const updatedCard = data.cards.find(c => c.accountNumber === currentCard.accountNumber);
          if (updatedCard) {
            setCurrentCard(updatedCard);
          }
        } else {
          // No saved chat, show welcome message
          setCurrentCard(data.cards[0]); // Set first card as default
          
          // Welcome message with card info
          setMessages([{
            role: 'assistant',
            content: `Welcome to TechTrove Banking! 🏦\n\nYou have ${data.cards.length} card(s) registered.\nCurrent card: ${data.cards[0].name}\nCard Number: ${data.cards[0].accountNumber}\nBalance: RM${(data.cards[0].balance || 1000).toFixed(2)}\n\nI can help you with:\n• Transfer money - "transfer RM50 to [card number] [name]"\n• Check balance - "check balance"\n• View my cards - "my cards"\n• Transaction history - "history"\n\nHow can I assist you today?`,
            timestamp: new Date()
          }]);
        }
      } else {
        setMessages([{
          role: 'assistant',
          content: '⚠️ You need to create a card first before using the banking assistant.\n\nPlease visit the Card Creation page to get started.',
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Failed to load cards:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const processCommand = async (userInput) => {
    const input = userInput.toLowerCase().trim();

    // Check if we're in transfer confirmation state
    console.log('Transfer State:', transferState);
    console.log('User Input:', userInput);
    
    if (transferState.active && transferState.step === 'confirm') {
      console.log('In transfer confirmation state!');
      if (input.includes('confirm') || input.includes('yes') || input.includes('proceed')) {
        console.log('Executing transfer...', transferState);
        const result = await executeTransfer(transferState.amount, transferState.recipientCard, transferState.recipientName);
        setTransferState({ active: false, step: null, amount: null, recipientCard: null, recipientName: null, bank: null });
        return result;
      } else if (input.includes('cancel') || input.includes('no') || input.includes('abort')) {
        console.log('Cancelling transfer...');
        setTransferState({ active: false, step: null, amount: null, recipientCard: null, recipientName: null, bank: null });
        return {
          content: '✋ No worries! I\'ve cancelled the transfer for you.\n\nYour money is safe. Let me know if you need anything else! 😊',
          type: 'text',
          showConfirmButtons: false
        };
      }
    }

    // Use OpenAI to understand intent and generate responses naturally
    try {
      // Get recent conversation history for context (last 10 messages)
      const recentMessages = messages.slice(-10).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const aiResponse = await fetch('/api/chatbot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userInput,
          conversationHistory: recentMessages,
          userId: userId,
          currentCard: currentCard,
          userCards: userCards
        })
      });

      console.log('AI Response status:', aiResponse.status);

      if (aiResponse.ok) {
        const data = await aiResponse.json();
        console.log('AI Response data:', data);
        
        // If AI detected a complete action, execute it
        if (data.action) {
          switch (data.action.action) {
            case 'balance':
              return await handleBalanceCheck();
              
            case 'view_cards':
              return handleViewCards();
              
            case 'history':
              return await handleTransactionHistory();
              
            case 'transfer':
              // Only execute if we have COMPLETE information (bank, accountNumber, and amount)
              if (data.action.bank && data.action.accountNumber && data.action.amount) {
                const cleanAccountNumber = data.action.accountNumber.replace(/[-\s]/g, '');
                const bankName = data.action.bank;
                
                try {
                  // Fetch user's cards to get current balance
                  let activeCard = currentCard;
                  if (!activeCard || activeCard.balance === undefined) {
                    const cardsRes = await fetch('/api/cards/list?userId=' + userId);
                    const cardsData = await cardsRes.json();
                    
                    if (!cardsData.ok || cardsData.cards.length === 0) {
                      return {
                        content: '😔 Unable to find your cards. Please try again!',
                        type: 'error'
                      };
                    }
                    
                    activeCard = cardsData.cards[0];
                  }
                  
                  const verifyRes = await fetch(`/api/cards/verify?cardNumber=${cleanAccountNumber}`);
                  const verifyData = await verifyRes.json();
                  
                  if (!verifyData.exists) {
                    return {
                      content: `I couldn't find an account with number ${cleanAccountNumber}. Please check the account number and try again! 😊`,
                      type: 'error'
                    };
                  }
                  
                  // Validate bank name matches the card's actual bank
                  const recipientCardBank = verifyData.card.bank;
                  if (recipientCardBank && bankName.toLowerCase() !== recipientCardBank.toLowerCase()) {
                    return {
                      content: `❌ Invalid Bank or Account Number!\n\nThe bank name and account number combination you provided is incorrect. Please verify the details and try again! 😊`,
                      type: 'error'
                    };
                  }
                  
                  if (cleanAccountNumber === activeCard.accountNumber) {
                    return {
                      content: 'You can\'t transfer money to yourself! Please provide a different account number. 😊',
                      type: 'error'
                    };
                  }
                  
                  if (data.action.amount > activeCard.balance) {
                    return {
                      content: `You don't have enough balance for this transfer. Your current balance is RM${activeCard.balance.toFixed(2)}, but you're trying to send RM${data.action.amount.toFixed(2)}. 💳`,
                      type: 'error'
                    };
                  }
                  
                  // Show confirmation summary before executing transfer
                  setTransferState({
                    active: true,
                    step: 'confirm',
                    amount: data.action.amount,
                    recipientCard: cleanAccountNumber,
                    recipientName: verifyData.card.name,
                    bank: bankName
                  });
                  
                  return {
                    content: `✨ Perfect! I found the recipient!\n\n━━━━━━━━━━━━━━━━━━━━━\n📋 TRANSFER CONFIRMATION\n━━━━━━━━━━━━━━━━━━━━━\n\n🏦 Bank: ${bankName}\n👤 Recipient: ${verifyData.card.name}\n💳 Account: ${cleanAccountNumber}\n💵 Amount: RM${data.action.amount.toFixed(2)}\n\n━━━━━━━━━━━━━━━━━━━━━\n� YOUR BALANCE\n━━━━━━━━━━━━━━━━━━━━━\n\n💰 Current Balance: RM${activeCard.balance.toFixed(2)}\n💰 After Transfer: RM${(activeCard.balance - data.action.amount).toFixed(2)}\n\n━━━━━━━━━━━━━━━━━━━━━\n\nPlease review and confirm this transfer! 😊`,
                    type: 'confirm',
                    showConfirmButtons: true
                  };
                  
                } catch (error) {
                  console.error('Transfer execution failed:', error);
                  return {
                    content: 'I encountered an error while processing your transfer. Please try again! 😅',
                    type: 'error'
                  };
                }
              } else {
                // ChatGPT is asking for more info - just return the conversational response
                return {
                  content: data.response || "I need more information to complete the transfer. Can you provide the missing details?",
                  type: 'text'
                };
              }
              
            default:
              // Return AI's conversational response
              return {
                content: data.response || "I'm not sure I understand. Can you try rephrasing that?",
                type: 'text'
              };
          }
        }
        
        // No specific action detected - check if response contains JSON
        if (data.response) {
          // Try to extract JSON from the response
          const jsonMatch = data.response.match(/\{[\s\S]*"action"[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsedAction = JSON.parse(jsonMatch[0]);
              if (parsedAction.action === 'transfer' && parsedAction.bank && parsedAction.accountNumber && parsedAction.amount) {
                // Handle the transfer action with new format (bank, accountNumber, amount)
                const cleanAccountNumber = parsedAction.accountNumber.replace(/[-\s]/g, '');
                const bankName = parsedAction.bank;
                
                try {
                  // Get current user's active card if not already available
                  let activeCard = currentCard;
                  if (!activeCard || activeCard.balance === undefined) {
                    const cardsRes = await fetch('/api/cards/list?userId=' + userId);
                    const cardsData = await cardsRes.json();
                    
                    if (!cardsData.ok || cardsData.cards.length === 0) {
                      return {
                        content: '😔 Unable to find your cards. Please try again!',
                        type: 'error'
                      };
                    }
                    
                    // Use the first card as active card
                    activeCard = cardsData.cards[0];
                  }
                  
                  const verifyRes = await fetch(`/api/cards/verify?cardNumber=${cleanAccountNumber}`);
                  const verifyData = await verifyRes.json();
                  
                  if (!verifyData.exists) {
                    return {
                      content: `I couldn't find an account with number ${cleanAccountNumber}. Please check the account number and try again! 😊`,
                      type: 'error'
                    };
                  }
                  
                  // Validate bank name matches the card's actual bank
                  const recipientCardBank = verifyData.card.bank;
                  if (recipientCardBank && bankName.toLowerCase() !== recipientCardBank.toLowerCase()) {
                    return {
                      content: `❌ Invalid Bank or Account Number!\n\nThe bank name and account number combination you provided is incorrect. Please verify the details and try again! 😊`,
                      type: 'error'
                    };
                  }
                  
                  if (cleanAccountNumber === activeCard.accountNumber) {
                    return {
                      content: 'You can\'t transfer money to yourself! Please provide a different account number. 😊',
                      type: 'error'
                    };
                  }
                  
                  if (parsedAction.amount > activeCard.balance) {
                    return {
                      content: `You don't have enough balance for this transfer. Your current balance is RM${activeCard.balance.toFixed(2)}, but you're trying to send RM${parsedAction.amount.toFixed(2)}. 💳`,
                      type: 'error'
                    };
                  }
                  
                  // Show confirmation summary before executing transfer
                  setTransferState({
                    active: true,
                    step: 'confirm',
                    amount: parsedAction.amount,
                    recipientCard: cleanAccountNumber,
                    recipientName: verifyData.card.name,
                    bank: bankName
                  });
                  
                  return {
                    content: `✨ Perfect! I found the recipient!\n\n━━━━━━━━━━━━━━━━━━━━━\n📋 TRANSFER CONFIRMATION\n━━━━━━━━━━━━━━━━━━━━━\n\n🏦 Bank: ${bankName}\n� Recipient: ${verifyData.card.name}\n💳 Account: ${cleanAccountNumber}\n�💵 Amount: RM${parsedAction.amount.toFixed(2)}\n\n━━━━━━━━━━━━━━━━━━━━━\n� YOUR BALANCE\n━━━━━━━━━━━━━━━━━━━━━\n\n💰 Current Balance: RM${activeCard.balance.toFixed(2)}\n💰 After Transfer: RM${(activeCard.balance - parsedAction.amount).toFixed(2)}\n\n━━━━━━━━━━━━━━━━━━━━━\n\nPlease review and confirm this transfer! 😊`,
                    type: 'confirm',
                    showConfirmButtons: true
                  };
                } catch (error) {
                  console.error('Transfer verification failed:', error);
                  return {
                    content: 'I encountered an error while verifying the account. Please try again! 😅',
                    type: 'error'
                  };
                }
              }
            } catch (e) {
              // Not valid JSON, continue with normal response
              console.log('Failed to parse JSON from response:', e);
            }
          }
        }
        
        // Return AI's conversational response
        return {
          content: data.response || "I'm here to help! Try asking me to check your balance, view cards, or transfer money.",
          type: 'text'
        };
      } else {
        // API returned an error
        const errorData = await aiResponse.json().catch(() => ({}));
        console.error('API Error:', errorData);
        
        let errorMessage = '😅 I encountered an issue';
        if (errorData.error) {
          errorMessage += `: ${errorData.error}`;
          if (errorData.details) {
            errorMessage += `\n\nDetails: ${errorData.details}`;
          }
        }
        errorMessage += '\n\nPlease try again!';
        
        return {
          content: errorMessage,
          type: 'error'
        };
      }
    } catch (error) {
      console.error('AI processing failed:', error);
      return {
        content: '😅 I\'m having a small technical difficulty right now.\n\nPlease try again in a moment!',
        type: 'error'
      };
    }
  };

  const handleTransferFlow = async (userInput) => {
    const { step, amount, recipientCard } = transferState;

    // Step 1: Get amount
    if (step === 'amount') {
      const amountMatch = userInput.match(/(?:rm|RM)?\s*(\d+(?:\.\d{2})?)/i);
      if (!amountMatch) {
        return {
          content: '❌ Invalid amount. Please enter a valid number (e.g., 50 or RM50):',
          type: 'error'
        };
      }

      const transferAmount = parseFloat(amountMatch[1]);
      
      if (transferAmount <= 0) {
        return {
          content: '❌ Amount must be greater than 0. Please try again:',
          type: 'error'
        };
      }

      if (currentCard.balance < transferAmount) {
        setTransferState({ active: false, step: null, amount: null, recipientCard: null, recipientName: null, bank: null });
        return {
          content: `❌ Insufficient Balance\n\nYour balance: RM${currentCard.balance.toFixed(2)}\nRequested amount: RM${transferAmount.toFixed(2)}\nShortfall: RM${(transferAmount - currentCard.balance).toFixed(2)}\n\nTransfer cancelled.`,
          type: 'error'
        };
      }

      setTransferState({
        ...transferState,
        step: 'card',
        amount: transferAmount
      });

      return {
        content: `💸 Transfer Amount: RM${transferAmount.toFixed(2)}\n\nPlease provide the recipient's 16-digit card number:`,
        type: 'text'
      };
    }

    // Step 2: Get card number and verify
    if (step === 'card') {
      const cardMatch = userInput.match(/(\d{16}|\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4})/);
      
      if (!cardMatch) {
        return {
          content: '😅 Hmm, that card number doesn\'t look quite right.\n\nPlease enter a valid 16-digit card number (you can include spaces or dashes if you like):',
          type: 'error'
        };
      }

      const cardNumber = cardMatch[1].replace(/[-\s]/g, '');

      // Check if trying to transfer to self
      if (cardNumber === currentCard.accountNumber) {
        setTransferState({ active: false, step: null, amount: null, recipientCard: null, recipientName: null, bank: null });
        return {
          content: '😊 I notice that\'s your own card number!\n\nYou can\'t transfer money to yourself. Please enter a different card number, or type "cancel" to stop.\n\nTransfer cancelled.',
          type: 'error'
        };
      }

      // Verify card exists in database
      try {
        const verifyRes = await fetch(`/api/cards/verify?cardNumber=${cardNumber}`);
        const verifyData = await verifyRes.json();
        
        if (!verifyData.exists) {
          setTransferState({ active: false, step: null, amount: null, recipientCard: null, recipientName: null, bank: null });
          return {
            content: `🔍 I couldn't find a card with that number.\n\nThe card number ${cardNumber} is not registered in our system yet.\n\n💡 Tip: You can only transfer to cards that exist in our database. Please double-check the number and try again!\n\nTransfer cancelled for your security.`,
            type: 'error'
          };
        }

        // Card found! Show confirmation
        setTransferState({
          ...transferState,
          step: 'confirm',
          recipientCard: cardNumber,
          recipientName: verifyData.card.name
        });

        return {
          content: `✨ Perfect! I found the recipient!\n\n━━━━━━━━━━━━━━━━━━━━━\n📋 TRANSFER SUMMARY\n━━━━━━━━━━━━━━━━━━━━━\n\n💵 Amount: RM${amount.toFixed(2)}\n🏦 To Card: ${cardNumber}\n👤 Recipient: ${verifyData.card.name}\n\n━━━━━━━━━━━━━━━━━━━━━\n\nEverything looks good? Please confirm to complete this transfer! 😊`,
          type: 'confirm',
          showConfirmButtons: true
        };

      } catch (error) {
        console.error('Card verification failed:', error);
        setTransferState({ active: false, step: null, amount: null, recipientCard: null, recipientName: null, bank: null });
        return {
          content: '😅 Oops! I\'m having trouble verifying that card right now.\n\nPlease try again in a moment. Your transfer has been cancelled for safety.',
          type: 'error'
        };
      }
    }

    // Step 3: Confirm and execute
    if (step === 'confirm') {
      const input = userInput.toLowerCase();
      
      if (input.includes('confirm') || input.includes('yes') || input.includes('proceed')) {
        const result = await executeTransfer(amount, recipientCard, transferState.recipientName);
        setTransferState({ active: false, step: null, amount: null, recipientCard: null, recipientName: null, bank: null });
        return result;
      } else if (input.includes('cancel') || input.includes('no') || input.includes('abort')) {
        setTransferState({ active: false, step: null, amount: null, recipientCard: null, recipientName: null, bank: null });
        return {
          content: '✋ No worries! I\'ve cancelled the transfer for you.\n\nYour money is safe. Let me know if you need anything else! 😊',
          type: 'text',
          showConfirmButtons: false
        };
      } else {
        return {
          content: '🤔 Just to confirm - would you like to proceed?\n\nPlease type "confirm" to complete the transfer, or "cancel" if you\'ve changed your mind:',
          type: 'text'
        };
      }
    }

    return { content: '🤔 Something unexpected happened. Please try again or type "cancel" to start over!', type: 'error' };
  };

  const handleBalanceCheck = async () => {
    if (!currentCard) {
      // Let ChatGPT handle this message
      return {
        content: "Please select a card first to check your balance.",
        type: 'text'
      };
    }

    try {
      // Reload card data to get latest balance
      const res = await fetch(`/api/cards/list?userId=${userId}`);
      const data = await res.json();
      
      if (data.ok) {
        const card = data.cards.find(c => c.accountNumber === currentCard.accountNumber);
        if (card) {
          setCurrentCard(card);
          
          // Return balance data - let ChatGPT format the response
          return {
            content: `Current Balance: RM${(card.balance || 1000).toFixed(2)}\nCard: ${card.name}\nCard Number: ${card.accountNumber}`,
            type: 'balance',
            balanceData: {
              balance: card.balance || 1000,
              cardName: card.name,
              cardNumber: card.accountNumber,
              currency: card.currency || 'MYR'
            }
          };
        }
      }
    } catch (error) {
      console.error('Balance check failed:', error);
    }
    
    return { 
      content: 'Unable to fetch balance at the moment. Please try again.',
      type: 'error' 
    };
  };

  const handleViewCards = () => {
    if (userCards.length === 0) {
      return { 
        content: 'No cards found. You need to create a card first.',
        type: 'text' 
      };
    }

    const cardsList = userCards.map((card, idx) => 
      `${idx + 1}. ${card.name}${currentCard?.accountNumber === card.accountNumber ? ' (Active)' : ''} - ${card.accountNumber} - RM${(card.balance || 1000).toFixed(2)}`
    ).join('\n');

    return { 
      content: `Your Cards:\n${cardsList}`,
      type: 'text',
      cardsData: userCards
    };
  };

  const handleSwitchCard = () => {
    if (userCards.length <= 1) {
      return { 
        content: 'You only have one card.',
        type: 'text' 
      };
    }

    const cardOptions = userCards.map((card, idx) => 
      `${idx + 1}. ${card.name} - ${card.accountNumber}`
    ).join('\n');

    return {
      content: `Select a card:\n${cardOptions}`,
      type: 'switch_card'
    };
  };

  const handleTransactionHistory = async () => {
    if (!userId) {
      return { 
        content: 'Please log in to view transaction history.',
        type: 'error' 
      };
    }

    try {
      const res = await fetch(`/api/cards/transaction-history?userId=${userId}&limit=10`);
      const data = await res.json();
      
      if (data.ok && data.transactions.length > 0) {
        const historyText = data.transactions.slice(0, 5).map(tx => {
          const isSender = tx.senderCardNumber === currentCard?.accountNumber;
          const type = isSender ? 'Sent' : 'Received';
          const amount = isSender ? `-RM${tx.amount.toFixed(2)}` : `+RM${tx.amount.toFixed(2)}`;
          return `${type}: ${amount} - ${tx.senderName} → ${tx.recipientName} - ${new Date(tx.timestamp).toLocaleString()}`;
        }).join('\n');
        
        return { 
          content: `Recent Transactions:\n${historyText}`,
          type: 'text',
          transactionsData: data.transactions
        };
      }
      
      return { 
        content: 'No transactions found.',
        type: 'text' 
      };
    } catch (error) {
      console.error('Failed to fetch history:', error);
      return { 
        content: 'Unable to fetch transaction history.',
        type: 'error' 
      };
    }
  };

  const parseTransferCommand = (input) => {
    // Try to extract amount, card number, and name
    const amountMatch = input.match(/(?:rm|RM)?\s*(\d+(?:\.\d{2})?)/i);
    const cardMatch = input.match(/(\d{16}|\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4})/);
    
    // Extract name (words after card number or "to")
    let name = null;
    if (cardMatch) {
      const afterCard = input.substring(input.indexOf(cardMatch[0]) + cardMatch[0].length);
      const nameMatch = afterCard.trim().match(/^[\s-]*([A-Za-z\s]+?)(?:\s*$)/);
      if (nameMatch) {
        name = nameMatch[1].trim();
      }
    } else {
      const toIndex = input.toLowerCase().indexOf(' to ');
      if (toIndex !== -1) {
        const afterTo = input.substring(toIndex + 4);
        const nameMatch = afterTo.match(/([A-Za-z\s]+?)(?:\s+\d|$)/);
        if (nameMatch) {
          name = nameMatch[1].trim();
        }
      }
    }

    return {
      amount: amountMatch ? parseFloat(amountMatch[1]) : null,
      cardNumber: cardMatch ? cardMatch[1].replace(/[-\s]/g, '') : null,
      name: name
    };
  };

  const executeTransfer = async (amount, recipientCardNumber, recipientName) => {
    console.log('executeTransfer called with:', { amount, recipientCardNumber, recipientName, currentCard, userId });
    
    if (!currentCard) {
      return { 
        content: '😊 To make transfers, you\'ll need to have a card first.\n\nPlease create one from the Card Creation page!', 
        type: 'error',
        showConfirmButtons: false
      };
    }

    if (!userId) {
      return { 
        content: '😊 Please log in first to make transfers!', 
        type: 'error',
        showConfirmButtons: false
      };
    }

    // Refresh current card data to ensure we have the latest info
    try {
      const cardsRes = await fetch(`/api/cards/list?userId=${userId}`);
      const cardsData = await cardsRes.json();
      if (cardsData.ok && cardsData.cards.length > 0) {
        const freshCard = cardsData.cards.find(c => c.accountNumber === currentCard.accountNumber) || cardsData.cards[0];
        setCurrentCard(freshCard);
        
        console.log('Fresh card data:', freshCard);
        
        // Use fresh card for transfer
        console.log('Sending transfer request to API...');
        const res = await fetch('/api/cards/transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderUserId: userId,
            senderCardNumber: freshCard.accountNumber,
            recipientCardNumber: recipientCardNumber,
            recipientName: recipientName,
            amount: amount
          })
        });

        const data = await res.json();
        console.log('Transfer API response:', data);
        
        if (data.ok) {
          // Refresh cards to get updated balance
          await loadUserCards(userId);
          
          return {
            content: `🎉 Transfer Successful!\n\n━━━━━━━━━━━━━━━━━━━━━\n💸 Amount: RM${amount.toFixed(2)}\n👤 To: ${recipientName}\n🏦 Card: ${recipientCardNumber}\n📅 ${new Date(data.transaction.timestamp).toLocaleString()}\n━━━━━━━━━━━━━━━━━━━━━\n\n💰 Previous Balance: RM${data.previousBalance.toFixed(2)}\n💰 New Balance: RM${data.newBalance.toFixed(2)}\n\n🆔 Transaction ID: ${data.transaction.id}\n\nThank you for using our service! Is there anything else I can help you with? 😊`,
            type: 'success',
            showConfirmButtons: false
          };
        } else {
          return {
            content: `😔 I'm sorry, but the transfer couldn't be completed.\n\n❌ Reason: ${data.error}\n${data.hint || ''}\n\nPlease try again or let me know if you need help!`,
            type: 'error',
            showConfirmButtons: false
          };
        }
      } else {
        return {
          content: '😔 Unable to load your card information. Please try again!',
          type: 'error',
          showConfirmButtons: false
        };
      }
    } catch (error) {
      console.error('Transfer error:', error);
      return {
        content: '😅 Oops! Something went wrong during the transfer.\n\nPlease check your connection and try again. Your money is safe!',
        type: 'error',
        showConfirmButtons: false
      };
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      // Check if switching card by number
      if (messages[messages.length - 1]?.type === 'switch_card' && /^\d+$/.test(currentInput)) {
        const cardIndex = parseInt(currentInput) - 1;
        if (cardIndex >= 0 && cardIndex < userCards.length) {
          const newCard = userCards[cardIndex];
          setCurrentCard(newCard);
          
          // Clear chat history when switching cards
          localStorage.removeItem('chatHistory');
          localStorage.removeItem('chatActiveCard');
          
          setMessages([{
            role: 'assistant',
            content: `✨ Successfully switched!\n\n📱 Active Card: ${newCard.name}\n🔢 Card Number: ${newCard.accountNumber}\n💰 Balance: RM${(newCard.balance || 1000).toFixed(2)}\n\n🔄 I've started a fresh conversation for this card. How can I help you today? 😊`,
            type: 'text',
            timestamp: new Date()
          }]);
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '🤔 Hmm, I couldn\'t find that card number.\n\nPlease check and try again, or type the card number from the list!',
            type: 'error',
            timestamp: new Date()
          }]);
        }
      } else {
        // Process as regular command
        const response = await processCommand(currentInput);
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.content,
          type: response.type,
          showConfirmButtons: response.showConfirmButtons || false,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '😅 Oops! Something unexpected happened.\n\nPlease try again, and let me know if you continue to have issues!',
        type: 'error',
        timestamp: new Date()
      }]);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-3 rounded-full">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Banking Assistant</h1>
                  <p className="text-white/80 text-sm">Your AI-powered financial assistant</p>
                </div>
              </div>
              {currentCard && (
                <div className="bg-white/20 px-4 py-2 rounded-lg">
                  <p className="text-white text-xs">Active Card</p>
                  <p className="text-white font-semibold">{currentCard.name}</p>
                  <p className="text-white/80 text-xs">RM{(currentCard.balance || 1000).toFixed(2)}</p>
                </div>
              )}
              <button
                onClick={() => {
                  if (confirm('Clear all chat history? This cannot be undone.')) {
                    localStorage.removeItem('chatHistory');
                    localStorage.removeItem('chatActiveCard');
                    setMessages([{
                      role: 'assistant',
                      content: 'Chat history cleared. How can I help you today?',
                      timestamp: new Date()
                    }]);
                  }
                }}
                className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-2 rounded-lg border border-white/20 transition-all"
                title="Clear chat history"
              >
                🗑️ Clear Chat
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="h-[500px] overflow-y-auto p-6 space-y-4 bg-slate-900/50">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="bg-purple-600 p-2 rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                
                <div
                  className={`max-w-[75%] rounded-2xl p-4 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : message.type === 'error'
                      ? 'bg-red-500/20 text-red-100 border border-red-500/30'
                      : message.type === 'success'
                      ? 'bg-green-500/20 text-green-100 border border-green-500/30'
                      : message.type === 'balance'
                      ? 'bg-blue-500/20 text-blue-100 border border-blue-500/30'
                      : 'bg-white/10 text-white border border-white/20'
                  }`}
                >
                  <p className="whitespace-pre-line text-sm leading-relaxed">{message.content}</p>
                  <p className="text-xs mt-2 opacity-70">
                    {message.timestamp instanceof Date 
                      ? message.timestamp.toLocaleTimeString() 
                      : new Date(message.timestamp).toLocaleTimeString()
                    }
                  </p>
                  
                  {/* Confirmation Buttons */}
                  {message.showConfirmButtons && message.type === 'confirm' && (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={async () => {
                          // Hide all confirmation buttons first
                          setMessages(prev => prev.map(msg => ({
                            ...msg,
                            showConfirmButtons: false
                          })));
                          
                          // Add user message
                          setMessages(prev => [...prev, {
                            role: 'user',
                            content: 'confirm',
                            timestamp: new Date()
                          }]);
                          
                          setLoading(true);
                          
                          // Process the confirmation
                          const response = await processCommand('confirm');
                          
                          setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: response.content,
                            type: response.type,
                            showConfirmButtons: false,
                            timestamp: new Date()
                          }]);
                          
                          setLoading(false);
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        ✅ Confirm Transfer
                      </button>
                      <button
                        onClick={async () => {
                          // Hide all confirmation buttons first
                          setMessages(prev => prev.map(msg => ({
                            ...msg,
                            showConfirmButtons: false
                          })));
                          
                          // Add user message
                          setMessages(prev => [...prev, {
                            role: 'user',
                            content: 'cancel',
                            timestamp: new Date()
                          }]);
                          
                          setLoading(true);
                          
                          // Process the cancellation
                          const response = await processCommand('cancel');
                          
                          setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: response.content,
                            type: response.type,
                            showConfirmButtons: false,
                            timestamp: new Date()
                          }]);
                          
                          setLoading(false);
                        }}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        ❌ Cancel
                      </button>
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="bg-blue-600 p-2 rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="bg-purple-600 p-2 rounded-full h-8 w-8 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white/10 rounded-2xl p-4 border border-white/20">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-4 bg-slate-900/70 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message... (e.g., 'transfer RM50 to 1234567890123456 John Doe')"
                className="flex-1 bg-white/10 text-white placeholder-white/50 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={loading || !currentCard}
              />
              <button
                type="submit"
                disabled={loading || !input.trim() || !currentCard}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl px-6 py-3 hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>

          {/* Quick Actions */}
          <div className="p-4 bg-slate-900/50 border-t border-white/10">
            <p className="text-white/60 text-xs mb-2">Quick Actions:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  if (!currentCard || loading) return;
                  
                  setMessages(prev => [...prev, {
                    role: 'user',
                    content: 'transfer money',
                    timestamp: new Date()
                  }]);
                  
                  setLoading(true);
                  const response = await processCommand('transfer money');
                  
                  setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: response.content,
                    type: response.type,
                    showConfirmButtons: response.showConfirmButtons || false,
                    timestamp: new Date()
                  }]);
                  
                  setLoading(false);
                }}
                disabled={!currentCard || loading}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs px-4 py-2 rounded-lg border border-white/20 transition-all disabled:opacity-50 font-semibold"
              >
                💸 Make Transaction
              </button>
              <button
                onClick={async () => {
                  if (!currentCard || loading) return;
                  
                  setMessages(prev => [...prev, {
                    role: 'user',
                    content: 'check balance',
                    timestamp: new Date()
                  }]);
                  
                  setLoading(true);
                  const response = await processCommand('check balance');
                  
                  setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: response.content,
                    type: response.type,
                    showConfirmButtons: response.showConfirmButtons || false,
                    timestamp: new Date()
                  }]);
                  
                  setLoading(false);
                }}
                disabled={!currentCard || loading}
                className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg border border-white/20 transition-all disabled:opacity-50"
              >
                💰 Check Balance
              </button>
              <button
                onClick={async () => {
                  if (!currentCard || loading) return;
                  
                  setMessages(prev => [...prev, {
                    role: 'user',
                    content: 'my cards',
                    timestamp: new Date()
                  }]);
                  
                  setLoading(true);
                  const response = await processCommand('my cards');
                  
                  setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: response.content,
                    type: response.type,
                    showConfirmButtons: response.showConfirmButtons || false,
                    timestamp: new Date()
                  }]);
                  
                  setLoading(false);
                }}
                disabled={!currentCard || loading}
                className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg border border-white/20 transition-all disabled:opacity-50"
              >
                🏦 My Cards
              </button>
              <button
                onClick={async () => {
                  if (!currentCard || loading) return;
                  
                  setMessages(prev => [...prev, {
                    role: 'user',
                    content: 'transaction history',
                    timestamp: new Date()
                  }]);
                  
                  setLoading(true);
                  const response = await processCommand('transaction history');
                  
                  setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: response.content,
                    type: response.type,
                    showConfirmButtons: response.showConfirmButtons || false,
                    timestamp: new Date()
                  }]);
                  
                  setLoading(false);
                }}
                disabled={!currentCard || loading}
                className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg border border-white/20 transition-all disabled:opacity-50"
              >
                📜 History
              </button>
              <button
                onClick={async () => {
                  if (!currentCard || userCards.length <= 1 || loading) return;
                  
                  setMessages(prev => [...prev, {
                    role: 'user',
                    content: 'switch card',
                    timestamp: new Date()
                  }]);
                  
                  setLoading(true);
                  const response = await processCommand('switch card');
                  
                  setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: response.content,
                    type: response.type,
                    showConfirmButtons: response.showConfirmButtons || false,
                    timestamp: new Date()
                  }]);
                  
                  setLoading(false);
                }}
                disabled={!currentCard || userCards.length <= 1 || loading}
                className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg border border-white/20 transition-all disabled:opacity-50"
              >
                🔄 Switch Card
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
