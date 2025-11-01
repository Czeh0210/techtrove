'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, CreditCard, ArrowRightLeft, Wallet } from 'lucide-react';
import Navigation from '@/components/Navigation';
import dynamic from 'next/dynamic';

const Camera = dynamic(() => import('@/components/Camera'), { ssr: false });

export default function BankingChatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userCards, setUserCards] = useState([]);
  const [currentCard, setCurrentCard] = useState(null);
  const [transferState, setTransferState] = useState({
    active: false,
    step: null, // 'amount', 'card', 'confirm', 'verify'
    amount: null,
    recipientCard: null,
    recipientName: null,
    bank: null
  });
  const [verificationState, setVerificationState] = useState({
    active: false,
    method: null, // 'password' or 'faceid'
    password: '',
    error: null,
    faceEmbedding: null,
    scanning: false
  });
  const [dashboardRedirect, setDashboardRedirect] = useState({
    pending: false,
    type: null // 'history'
  });
  const [isClient, setIsClient] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [quickActionsOpen, setQuickActionsOpen] = useState(true);
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
      console.log('Failed to load chat history:', error);
    }
    
    // Check session after client is ready
    checkSession();
  }, []);

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
    // Remove the isClient check here since we call it after setIsClient(true)
    
    try {
      // Try to get sessionId from localStorage
      const sessionId = localStorage.getItem('sessionId');
      console.log('🔍 Checking session. sessionId from localStorage:', sessionId);
      
      if (!sessionId) {
        console.log('❌ No sessionId found in localStorage. User needs to log in.');
        setMessages([{
          role: 'assistant',
          content: '👋 Welcome! I\'m your friendly banking assistant.\n\n🔐 To get started, please log in to access your cards and make transfers. I\'m here to help you manage your finances safely and easily!',
          timestamp: new Date()
        }]);
        return;
      }

      console.log('📡 Verifying session with API...');
      const res = await fetch('/api/auth/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      console.log('📡 Session verification status:', res.status, res.ok);

      if (!res.ok) {
        console.log('❌ Session verification failed with status:', res.status);
        setMessages([{
          role: 'assistant',
          content: '⏰ Hi there! It looks like your session has expired for security reasons.\n\nPlease log in again, and I\'ll be right here to assist you with your banking needs!',
          timestamp: new Date()
        }]);
        return;
      }

      const data = await res.json();
      console.log('✅ Session verification response:', data);
      if (data.valid && data.session?.userId) {
        console.log('✅ Setting userId to:', data.session.userId);
        setUserId(data.session.userId);
        await loadUserCards(data.session.userId);
      } else {
        console.log('❌ Session invalid or no userId:', data);
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
      console.log('🔄 loadUserCards called with userId:', uid);
      const apiUrl = `/api/cards/list?userId=${uid}`;
      console.log('🔄 Fetching from:', apiUrl);
      
      const res = await fetch(apiUrl);
      console.log('🔄 API Response status:', res.status, res.ok);
      
      const data = await res.json();
      console.log('🔍 API Response:', data);
      console.log('🔍 Loaded cards from API:', data.cards?.length, 'cards');
      
      if (data.ok && data.cards && data.cards.length > 0) {
        setUserCards(data.cards);
        console.log('✅ Updated userCards state with', data.cards.length, 'cards');
        console.log('✅ Full userCards data:', data.cards);
        
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
            content: `Welcome to Centryx! 💳\n\nYou have ${data.cards.length} card(s) registered.\nCurrent card: ${data.cards[0].name}\nCard Number: ${data.cards[0].accountNumber}\nBalance: RM${(data.cards[0].balance || 1000).toFixed(2)}\n\nI can help you with:\n• Transfer money - "transfer RM50 to [card number] [name]"\n• Check balance - "check balance"\n• View my cards - "my cards"\n• Transaction history - "history"\n\nHow can I assist you today?`,
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

  // Monitor userId state changes
  useEffect(() => {
    console.log('👤 userId state changed to:', userId);
  }, [userId]);

  // Monitor userCards state changes
  useEffect(() => {
    console.log('📊 userCards state changed:', userCards.length, 'cards');
    console.log('📊 Current userCards:', userCards);
  }, [userCards]);

  const processCommand = async (userInput) => {
    const input = userInput.toLowerCase().trim();

    // Check if we're in dashboard redirect confirmation state
    if (dashboardRedirect.pending) {
      if (input.includes('yes') || input.includes('confirm') || input.includes('proceed')) {
        setDashboardRedirect({ pending: false, type: null });
        
        if (dashboardRedirect.type === 'history') {
          // Redirect to dashboard
          if (typeof window !== 'undefined') {
            window.location.href = '/dashboard';
          }
          return {
            content: '🚀 Redirecting you to the dashboard now...',
            type: 'success',
            showConfirmButtons: false
          };
        }
      } else if (input.includes('no') || input.includes('cancel')) {
        setDashboardRedirect({ pending: false, type: null });
        return {
          content: '👍 No problem! I\'ll show you a quick summary here instead. Let me fetch your recent transactions...',
          type: 'text',
          showConfirmButtons: false
        };
      }
    }

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

      console.log('📤 Sending to chatbot API:', { userId, currentCard: currentCard?.name, userCardsCount: userCards.length });

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
              
            case 'download_statement':
              return await handleDownloadStatement(data.action.period);
              
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
        console.log('API Error:', errorData);
        
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

    // Set dashboard redirect pending state
    setDashboardRedirect({
      pending: true,
      type: 'history'
    });

    return {
      content: '📊 Would you like me to take you to the Dashboard?\n\nThere you can view your complete transaction history with advanced filters and visualizations! 🎯\n\nWould you like to go there now?',
      type: 'dashboard_confirm',
      showConfirmButtons: true
    };
  };

  const handleDownloadStatement = async (period) => {
    if (!userId) {
      return { 
        content: 'Please log in to download your statement.',
        type: 'error' 
      };
    }

    if (!period || !['day', 'week', 'month', '6months'].includes(period)) {
      return {
        content: 'Please specify a valid time period: today, this week, this month, or last 6 months.',
        type: 'error'
      };
    }

    try {
      // Fetch user's cards and transactions
      const [cardsRes, transactionsRes] = await Promise.all([
        fetch(`/api/cards/list?userId=${userId}`),
        fetch(`/api/cards/transaction-history?userId=${userId}&limit=1000`)
      ]);

      const cardsData = await cardsRes.json();
      const transactionsData = await transactionsRes.json();

      if (!cardsData.ok || !transactionsData.ok) {
        return {
          content: 'Failed to fetch your data. Please try again!',
          type: 'error'
        };
      }

      const cards = cardsData.cards || [];
      const allTransactions = transactionsData.transactions || [];

      // Filter transactions by period
      const now = new Date();
      const filteredTransactions = allTransactions.filter(tx => {
        const txDate = new Date(tx.timestamp);
        switch(period) {
          case 'day':
            return txDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return txDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return txDate >= monthAgo;
          case '6months':
            const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
            return txDate >= sixMonthsAgo;
          default:
            return true;
        }
      });

      // Calculate cash flow
      let cashIn = 0;
      let cashOut = 0;
      filteredTransactions.forEach(tx => {
        if (tx.recipientUserId === userId) {
          cashIn += tx.amount;
        }
        if (tx.senderUserId === userId) {
          cashOut += tx.amount;
        }
      });

      // Generate PDF content
      const periodLabel = period === 'day' ? 'Today' : 
                         period === 'week' ? 'Last 7 Days' : 
                         period === 'month' ? 'Last 30 Days' : 'Last 6 Months';

      const totalBalance = cards.reduce((sum, card) => sum + (card.balance || 0), 0);

      const pdfContent = generatePDFContent({
        periodLabel,
        cards,
        transactions: filteredTransactions,
        cashIn,
        cashOut,
        totalBalance,
        userId,
        accountInfo: `Total Cards: ${cards.length}`
      });

      // Open PDF in new window
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(pdfContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 250);

        return {
          content: `✅ Statement Generated!\n\n📄 Period: ${periodLabel}\n💰 Total Balance: RM${totalBalance.toFixed(2)}\n📊 Transactions: ${filteredTransactions.length}\n💵 Cash In: RM${cashIn.toFixed(2)}\n💸 Cash Out: RM${cashOut.toFixed(2)}\n\nYour PDF statement has been opened in a new window. You can save it or print it! 😊`,
          type: 'success'
        };
      } else {
        return {
          content: 'Please allow pop-ups to download your statement!',
          type: 'error'
        };
      }
    } catch (error) {
      console.error('Download statement error:', error);
      return {
        content: 'Failed to generate statement. Please try again!',
        type: 'error'
      };
    }
  };

  const generatePDFContent = ({ periodLabel, cards, transactions, cashIn, cashOut, totalBalance, userId, accountInfo }) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Transaction Statement - ${periodLabel}</title>
  <style>
    @page { 
      size: A4;
      margin: 20mm;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #1f2937;
      line-height: 1.6;
      margin: 0;
      padding: 0;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #7c3aed;
      padding-bottom: 20px;
    }
    .header h1 {
      color: #7c3aed;
      margin: 0 0 5px 0;
      font-size: 28px;
    }
    .header p {
      color: #6b7280;
      margin: 5px 0;
      font-size: 14px;
    }
    .info-section {
      background: #f9fafb;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      border-left: 4px solid #7c3aed;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .info-label {
      font-weight: 600;
      color: #374151;
    }
    .info-value {
      color: #6b7280;
    }
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    .summary-card {
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }
    .summary-card.cash-in {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
    }
    .summary-card.cash-out {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
    }
    .summary-card.net {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
    }
    .summary-card h3 {
      margin: 0 0 5px 0;
      font-size: 12px;
      opacity: 0.9;
    }
    .summary-card p {
      margin: 0;
      font-size: 22px;
      font-weight: bold;
    }
    .transactions-header {
      background: #7c3aed;
      color: white;
      padding: 12px 15px;
      border-radius: 8px 8px 0 0;
      font-weight: 600;
      font-size: 16px;
      margin-top: 20px;
    }
    .transaction-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .transaction-table th {
      background: #f3f4f6;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
    }
    .transaction-table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 12px;
    }
    .transaction-table tr:hover {
      background: #f9fafb;
    }
    .amount-in {
      color: #10b981;
      font-weight: 600;
    }
    .amount-out {
      color: #ef4444;
      font-weight: 600;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #9ca3af;
      font-size: 11px;
      border-top: 1px solid #e5e7eb;
      padding-top: 15px;
    }
    .no-transactions {
      text-align: center;
      padding: 40px;
      color: #9ca3af;
      font-style: italic;
    }
    @media print {
      body { margin: 0; }
      .transaction-table { page-break-inside: auto; }
      .transaction-table tr { page-break-inside: avoid; page-break-after: auto; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>💳 Centryx</h1>
    <p>Transaction Statement</p>
  </div>

  <div class="info-section">
    <div class="info-row">
      <span class="info-label">Statement Period:</span>
      <span class="info-value">${periodLabel}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Account:</span>
      <span class="info-value">All Cards</span>
    </div>
    <div class="info-row">
      <span class="info-label">${accountInfo.split(':')[0]}:</span>
      <span class="info-value">${accountInfo.split(':')[1] || cards.length}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Generated:</span>
      <span class="info-value">${new Date().toLocaleString()}</span>
    </div>
  </div>

  <div class="summary-cards">
    <div class="summary-card cash-in">
      <h3>Cash In</h3>
      <p>RM${cashIn.toFixed(2)}</p>
    </div>
    <div class="summary-card cash-out">
      <h3>Cash Out</h3>
      <p>RM${cashOut.toFixed(2)}</p>
    </div>
    <div class="summary-card net">
      <h3>Net Flow</h3>
      <p>RM${(cashIn - cashOut).toFixed(2)}</p>
    </div>
  </div>

  <div class="transactions-header">
    Transaction History (${transactions.length} transactions)
  </div>
  
  ${transactions.length > 0 ? `
    <table class="transaction-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>From</th>
          <th>To</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${transactions.map(tx => {
          const isIncoming = tx.recipientUserId === userId;
          const date = new Date(tx.timestamp);
          return `
            <tr>
              <td>${date.toLocaleDateString()} ${date.toLocaleTimeString()}</td>
              <td>${isIncoming ? '📥 Received' : '📤 Sent'}</td>
              <td>${tx.senderName || 'N/A'}</td>
              <td>${tx.recipientName || 'N/A'}</td>
              <td style="text-align: right;" class="${isIncoming ? 'amount-in' : 'amount-out'}">
                ${isIncoming ? '+' : '-'}RM${tx.amount.toFixed(2)}
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  ` : `
    <div class="no-transactions">
      No transactions found for the selected period.
    </div>
  `}

  <div class="footer">
    <p>This is a computer-generated statement and does not require a signature.</p>
    <p>Centryx © ${new Date().getFullYear()} • Confidential Document</p>
  </div>
</body>
</html>
    `;
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

  // Prevent hydration mismatch by not rendering until client-side is ready
  if (!isClient) {
    return (
      <div className="min-h-screen w-full relative overflow-hidden bg-white">
        <Navigation />
        
        <div className="flex pt-20">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-xl border-r border-gray-200 flex flex-col p-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-white p-2 rounded-lg border border-gray-200">
              <Bot className="w-6 h-6 text-black" />
            </div>
            <div>
              <h2 className="font-bold text-black text-sm">CENTRYX CHATBOT</h2>
              <p className="text-xs text-black">Loading...</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <Loader2 className="w-12 h-12 text-black animate-spin" />
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-white">
      {/* Main Navigation Bar - Separate at the top */}
      <Navigation />

      {/* Main Content Area with Sidebar and Chat */}
      <div className="flex pt-20">
      
      {/* Sidebar */}
      <div 
        className={`${
          sidebarOpen ? 'w-72' : 'w-0'
        } bg-white shadow-2xl border-r border-gray-200 flex flex-col transition-all duration-300 overflow-hidden h-screen`}
      >
        {/* CENTRYX CHATBOT Header in Sidebar */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl border border-gray-200">
              <Bot className="w-6 h-6 text-black" />
            </div>
            <div>
              <h2 className="font-bold text-black text-base whitespace-nowrap">CENTRYX CHATBOT</h2>
              <p className="text-xs text-black whitespace-nowrap">ASSISTANT</p>
            </div>
          </div>
        </div>

        {/* New Chat Button - Below navbar */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => {
              if (confirm('Start a new chat? Current conversation will be saved.')) {
                localStorage.removeItem('chatHistory');
                localStorage.removeItem('chatActiveCard');
                setMessages([{
                  role: 'assistant',
                  content: '👋 Welcome! How can I help you today?',
                  timestamp: new Date()
                }]);
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-black rounded-xl hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-sm border border-gray-200"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        {/* Active Card Info */}
        {currentCard && (
          <div className="p-6 border-b border-gray-200 bg-white">
            <p className="text-xs text-black mb-3 font-semibold uppercase tracking-wider">Active Card</p>
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
              <p className="font-bold text-black text-sm mb-2">{currentCard.name}</p>
              <p className="text-xs text-black mb-3 font-mono bg-gray-50 px-2 py-1 rounded">{currentCard.accountNumber}</p>
              <p className="text-2xl font-bold text-black">RM{(currentCard.balance || 1000).toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Debug Info & Actions */}
        {!currentCard && (
          <div className="p-6 border-b border-gray-200 bg-white">
            <p className="text-xs text-black mb-2">Debug Info:</p>
            <p className="text-xs text-black mb-3 font-mono bg-gray-50 px-2 py-1 rounded">
              userId: {userId || 'null'}<br/>
              cards: {userCards.length}
            </p>
            
            <button
              onClick={async () => {
                console.log('🔄 Force refresh session and cards...');
                await checkSession();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-black rounded-xl hover:bg-gray-50 transition-all border-2 border-gray-200 font-semibold text-sm mb-2"
            >
              🔄 Refresh Session
            </button>
            
            {userId && (
              <button
                onClick={async () => {
                  console.log('🔄 Manually reloading cards for userId:', userId);
                  await loadUserCards(userId);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-black rounded-xl hover:bg-gray-50 transition-all border-2 border-gray-200 font-semibold text-sm"
              >
                � Reload Cards ({userCards.length})
              </button>
            )}
          </div>
        )}

        {/* Spacer to push Clear Chat button to bottom */}
        <div className="flex-1"></div>

        {/* Clear Chat Button */}
        <div className="p-6 border-t border-gray-200 bg-white">
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
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-black rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold text-sm border-2 border-gray-200"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear Chat
          </button>
        </div>
      </div>

      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-white text-black p-3 rounded-r-xl shadow-2xl border border-gray-200 hover:bg-gray-50 transition-all duration-300 hover:scale-110"
        style={{ marginLeft: sidebarOpen ? '288px' : '0px', transition: 'margin-left 300ms' }}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-6 w-6 transition-transform duration-300 ${sidebarOpen ? '' : 'rotate-180'}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-[calc(100vh-5rem)]">
        {/* Horizontal Line Separator */}
        <div className="border-b-2 border-gray-200"></div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex flex-col h-full">

            {/* Messages Area - Scrollable with bottom padding for fixed input */}
            <div className="flex-1 overflow-y-auto px-8 py-6 pb-56 bg-white">
              <div className="max-w-6xl mx-auto space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="bg-white p-2.5 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0 shadow-lg border border-gray-200">
                    <Bot className="w-5 h-5 text-black" />
                  </div>
                )}
                
                <div
                  className={`max-w-[70%] rounded-2xl p-5 shadow-lg ${
                    message.role === 'user'
                      ? 'bg-white text-black border-2 border-gray-200'
                      : message.type === 'error'
                      ? 'bg-white text-black border-2 border-gray-200'
                      : message.type === 'success'
                      ? 'bg-white text-black border-2 border-gray-200'
                      : message.type === 'balance'
                      ? 'bg-white text-black border-2 border-gray-200'
                      : 'bg-white text-black border-2 border-gray-200'
                  }`}
                >
                  <p className="whitespace-pre-line text-sm leading-relaxed">{message.content}</p>
                  <p className={`text-xs mt-3 opacity-60`}>
                    {message.timestamp instanceof Date 
                      ? message.timestamp.toLocaleTimeString() 
                      : new Date(message.timestamp).toLocaleTimeString()
                    }
                  </p>
                  
                  {/* Confirmation Buttons */}
                  {message.showConfirmButtons && message.type === 'confirm' && (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => {
                          // Show verification modal instead of executing transfer
                          setVerificationState({
                            active: true,
                            method: null,
                            password: '',
                            error: null
                          });
                        }}
                        className="flex-1 bg-white hover:bg-gray-50 text-black font-semibold py-3 px-5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl border border-gray-200"
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
                        className="flex-1 bg-white hover:bg-gray-50 text-black font-semibold py-3 px-5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl border-2 border-gray-200"
                      >
                        ❌ Cancel
                      </button>
                    </div>
                  )}
                  
                  {/* Dashboard Redirect Confirmation Buttons */}
                  {message.showConfirmButtons && message.type === 'dashboard_confirm' && (
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
                            content: 'yes',
                            timestamp: new Date()
                          }]);
                          
                          setLoading(true);
                          
                          // Process the confirmation
                          const response = await processCommand('yes');
                          
                          setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: response.content,
                            type: response.type,
                            showConfirmButtons: false,
                            timestamp: new Date()
                          }]);
                          
                          setLoading(false);
                        }}
                        className="flex-1 bg-white hover:bg-gray-50 text-black font-semibold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2 border border-gray-200"
                      >
                        ✅ Yes, Take Me There
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
                            content: 'no',
                            timestamp: new Date()
                          }]);
                          
                          setLoading(true);
                          
                          // Process the cancellation
                          const response = await processCommand('no');
                          
                          setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: response.content,
                            type: response.type,
                            showConfirmButtons: false,
                            timestamp: new Date()
                          }]);
                          
                          setLoading(false);
                        }}
                        className="flex-1 bg-white hover:bg-gray-50 text-black font-semibold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2 border-2 border-gray-200"
                      >
                        ❌ No, Stay Here
                      </button>
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="bg-white p-2.5 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0 shadow-lg border border-gray-200">
                    <User className="w-5 h-5 text-black" />
                  </div>
                )}
              </div>
            ))}
            
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="bg-white p-2.5 rounded-full h-10 w-10 flex items-center justify-center shadow-lg border border-gray-200">
                  <Bot className="w-5 h-5 text-black" />
                </div>
                <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-lg">
                  <Loader2 className="w-6 h-6 text-black animate-spin" />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
        </div>

        {/* Fixed Input Area at Bottom - Completely isolated from scroll */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl z-40" style={{ marginLeft: sidebarOpen ? '288px' : '0px', transition: 'margin-left 300ms' }}>
          <div className="max-w-6xl mx-auto p-6">
            {/* Quick Actions - Collapsible */}
            {quickActionsOpen && (
            <div className="mb-4">
              <p className="text-black font-semibold text-sm mb-3 uppercase tracking-wider">Quick Actions:</p>
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
                    className="bg-white hover:bg-gray-50 text-black text-xs px-4 py-2 rounded-lg transition-all disabled:opacity-50 font-semibold shadow-md hover:shadow-lg border border-gray-200"
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
                    className="bg-white hover:bg-gray-50 text-black text-xs px-3 py-2 rounded-lg border-2 border-gray-200 transition-all disabled:opacity-50 font-medium shadow-sm hover:shadow-md"
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
                    className="bg-white hover:bg-gray-50 text-black text-xs px-3 py-2 rounded-lg border-2 border-gray-200 transition-all disabled:opacity-50 font-medium shadow-sm hover:shadow-md"
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
                    className="bg-white hover:bg-gray-50 text-black text-xs px-3 py-2 rounded-lg border-2 border-gray-200 transition-all disabled:opacity-50 font-medium shadow-sm hover:shadow-md"
                  >
                    📜 History
                  </button>
                  <button
                    onClick={async () => {
                      if (!currentCard || loading) return;
                      
                      setMessages(prev => [...prev, {
                        role: 'user',
                        content: 'download statement',
                        timestamp: new Date()
                      }]);
                      
                      setLoading(true);
                      const response = await processCommand('download statement');
                      
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
                    className="bg-white hover:bg-gray-50 text-black text-xs px-3 py-2 rounded-lg border-2 border-gray-200 transition-all disabled:opacity-50 font-medium shadow-sm hover:shadow-md"
                  >
                    📄 Download
                  </button>
                </div>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="mt-4">
              <div className="flex gap-3 items-center">
                {/* Toggle Arrow Button */}
                <button
                  type="button"
                  onClick={() => setQuickActionsOpen(!quickActionsOpen)}
                  className="bg-white text-black p-3 rounded-xl hover:bg-gray-50 transition-all border border-gray-200 shadow-md flex-shrink-0"
                  title={quickActionsOpen ? "Hide Quick Actions" : "Show Quick Actions"}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-5 w-5 transition-transform duration-300 ${quickActionsOpen ? 'rotate-90' : '-rotate-90'}`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message... (e.g., 'transfer RM50 to 1234567890123456 John Doe')"
                  className="flex-1 bg-white text-black placeholder-gray-400 border-2 border-gray-200 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent shadow-lg text-base"
                  disabled={loading || !currentCard}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim() || !currentCard}
                  className="bg-white text-black rounded-2xl px-8 py-4 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-xl hover:shadow-2xl font-semibold border border-gray-200"
                >
                  <Send className="w-6 h-6" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      </div>
      </div>

      {/* Verification Modal */}
      {verificationState.active && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setVerificationState({ 
          active: false, 
          method: null, 
          password: '', 
          error: null,
          faceEmbedding: null,
          scanning: false
        })}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-black mb-2">🔒 Verify Transfer</h2>
            <p className="text-gray-600 mb-6 text-sm">Choose your verification method to complete this transfer securely</p>
            
            {!verificationState.method ? (
              // Method Selection
              <div className="space-y-3">
                <button
                  onClick={() => setVerificationState({ ...verificationState, method: 'password' })}
                  className="w-full bg-white hover:bg-gray-50 text-black font-semibold py-4 px-6 rounded-xl border-2 border-gray-200 transition-all flex items-center justify-center gap-3 shadow-md hover:shadow-lg"
                >
                  <span className="text-2xl">🔑</span>
                  <span>Verify with Password</span>
                </button>
                
                <button
                  onClick={() => {
                    setVerificationState({ 
                      ...verificationState, 
                      method: 'faceid',
                      scanning: true,
                      error: null
                    });
                  }}
                  className="w-full bg-white hover:bg-gray-50 text-black font-semibold py-4 px-6 rounded-xl border-2 border-gray-200 transition-all flex items-center justify-center gap-3 shadow-md hover:shadow-lg"
                >
                  <span className="text-2xl">👤</span>
                  <span>Verify with Face ID</span>
                </button>
                
                {verificationState.error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {verificationState.error}
                  </div>
                )}
                
                <button
                  onClick={() => setVerificationState({ 
                    active: false, 
                    method: null, 
                    password: '', 
                    error: null,
                    faceEmbedding: null,
                    scanning: false
                  })}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            ) : verificationState.method === 'password' ? (
              // Password Input
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Enter Password</label>
                  <input
                    type="password"
                    value={verificationState.password}
                    onChange={(e) => setVerificationState({ ...verificationState, password: e.target.value })}
                    placeholder="Enter your login password"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-black"
                    autoFocus
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && verificationState.password) {
                        handlePasswordVerification();
                      }
                    }}
                  />
                </div>
                
                {verificationState.error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {verificationState.error}
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button
                    onClick={handlePasswordVerification}
                    disabled={!verificationState.password}
                    className="flex-1 bg-black hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Verify
                  </button>
                  <button
                    onClick={() => setVerificationState({ ...verificationState, method: null, password: '', error: null })}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-all"
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : verificationState.scanning ? (
              // Face ID Verification - Camera View
              <div className="text-center py-4">
                <div className="text-4xl mb-3">👤</div>
                <p className="text-gray-600 mb-4 font-semibold">Position your face in the camera</p>
                
                {/* Camera Component */}
                <div className="relative rounded-xl overflow-hidden border-2 border-gray-200 mb-4">
                  <Camera 
                    onEmbedding={(embedding) => {
                      console.log('🎥 Face embedding received:', embedding ? 'YES' : 'NO', embedding?.length);
                      // Store embedding from manual capture
                      if (embedding && Array.isArray(embedding) && embedding.length > 0) {
                        console.log('✅ Setting face embedding in state');
                        setVerificationState(prev => ({
                          ...prev,
                          faceEmbedding: embedding
                        }));
                      }
                    }}
                    autoCapture={false}
                    minFaceRelativeSize={0.20}
                  />
                </div>
                
                {verificationState.faceEmbedding ? (
                  <p className="text-sm text-green-600 font-semibold mb-4">✅ Face captured! Click verify to continue.</p>
                ) : (
                  <p className="text-sm text-gray-500 mb-4">📸 Click "Capture Face" button below to take photo</p>
                )}
                
                {/* Debug info */}
                <div className="text-xs text-gray-400 mb-2">
                  Debug: Embedding {verificationState.faceEmbedding ? `captured (${verificationState.faceEmbedding.length} values)` : 'not yet captured'}
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      console.log('🔘 Verify button clicked. Has embedding:', !!verificationState.faceEmbedding);
                      if (verificationState.faceEmbedding) {
                        handleFaceVerification(verificationState.faceEmbedding);
                      } else {
                        console.warn('⚠️ No face embedding available');
                      }
                    }}
                    disabled={!verificationState.faceEmbedding}
                    className="flex-1 bg-black hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    ✅ Verify Face
                  </button>
                  <button
                    onClick={() => setVerificationState({ 
                      ...verificationState, 
                      method: null, 
                      scanning: false, 
                      faceEmbedding: null,
                      error: null 
                    })}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // Face ID Verification in Progress (processing after capture)
              <div className="text-center py-8">
                <div className="text-6xl mb-4">👤</div>
                <p className="text-gray-600 mb-2">Verifying face...</p>
                <div className="flex justify-center">
                  <Loader2 className="w-8 h-8 text-black animate-spin" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Helper function for face verification
  async function handleFaceVerification(embedding) {
    try {
      // Stop scanning
      setVerificationState(prev => ({ ...prev, scanning: false }));
      
      const sessionId = localStorage.getItem('sessionId');
      const res = await fetch('/api/auth/verify-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          embedding
        })
      });
      
      const data = await res.json();
      
      if (res.ok && data.valid) {
        // Face verification success
        await handleVerificationSuccess();
      } else {
        // Face verification failed
        let errorMessage = data.error || 'Face verification failed.';
        if (data.similarity !== undefined && data.cosTh !== undefined) {
          errorMessage += `\n\nSimilarity: ${(data.similarity * 100).toFixed(1)}% (Required: ${(data.cosTh * 100).toFixed(0)}%)`;
        }
        
        setVerificationState({
          ...verificationState,
          method: null,
          scanning: false,
          error: errorMessage
        });
      }
    } catch (error) {
      console.error('Face verification error:', error);
      setVerificationState({
        ...verificationState,
        method: null,
        scanning: false,
        error: 'Face verification failed. Please try again or use password.'
      });
    }
  }

  // Helper function for password verification
  async function handlePasswordVerification() {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const res = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          password: verificationState.password
        })
      });
      
      if (res.ok) {
        await handleVerificationSuccess();
      } else {
        setVerificationState({
          ...verificationState,
          error: 'Incorrect password. Please try again.',
          password: ''
        });
      }
    } catch (error) {
      setVerificationState({
        ...verificationState,
        error: 'Verification failed. Please try again.',
        password: ''
      });
    }
  }

  // Helper function to execute transfer after successful verification
  async function handleVerificationSuccess() {
    setVerificationState({ active: false, method: null, password: '', error: null });
    
    // Hide all confirmation buttons
    setMessages(prev => prev.map(msg => ({
      ...msg,
      showConfirmButtons: false
    })));
    
    // Add user confirmation message
    setMessages(prev => [...prev, {
      role: 'user',
      content: 'confirm',
      timestamp: new Date()
    }]);
    
    setLoading(true);
    
    // Process the transfer
    const response = await processCommand('confirm');
    
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: response.content,
      type: response.type,
      showConfirmButtons: false,
      timestamp: new Date()
    }]);
    
    setLoading(false);
  }
}
