"use client";

import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { HeroSection } from "@/components/ui/hero-section-dark";
import { RetroGrid } from "@/components/ui/retro-grid";

function formatCurrency(n) {
  return "RM " + Number(n).toLocaleString("ms-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Typing animation component for bot messages
function TypingText({ text, speed = 30 }) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  return <span>{displayedText}</span>;
}

export default function ChatbotPage() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loginUser, setLoginUser] = useState("demo");
  const [loginPass, setLoginPass] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [showHero, setShowHero] = useState(true);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (token) {
      loadUser();
      loadBalance();
    }
  }, [token]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog]);

  useEffect(() => {
    if (token && !isSending) {
      inputRef.current?.focus();
    }
  }, [token, chatLog, isSending]);

  async function loadUser() {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (err) {
      console.error("Load user error:", err);
    }
  }

  async function login(e) {
    e && e.preventDefault();
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: loginUser, password: loginPass }),
    });
    if (res.ok) {
      const data = await res.json();
      setToken(data.token);
    } else {
      alert("Login failed");
    }
  }

  async function loadBalance() {
    const res = await fetch(`/api/transactions`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      setBalance(data.balance ?? 0);
    }
  }

  // Handler for quick reply buttons - sends message immediately
  function handleQuickReply(reply) {
    if (isSending) return;
    setChatLog((l) => [...l, { from: "user", text: reply }]);
    setIsSending(true);

    const history = chatLog.slice(-10).map((msg) => ({
      role: msg.from === "user" ? "user" : "assistant",
      content: msg.text,
    }));

    fetch("/api/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: reply, conversationHistory: history }),
    })
      .then(res => {
        if (!res.ok) {
          setChatLog((l) => [...l, { from: "bot", text: "Sorry, I couldn't reach the chatbot service." }]);
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (!data) return;
        const botMessage = { from: "bot", text: data.reply || "No response." };
        
        // Detect confirmation questions
        const lowerText = botMessage.text.toLowerCase();
        if (lowerText.includes("?") && (
          lowerText.includes("are you sure") ||
          lowerText.includes("do you confirm") ||
          (lowerText.includes("would you like to proceed") && (lowerText.includes("deposit") || lowerText.includes("payment") || lowerText.includes("purchase") || lowerText.includes("transaction") || lowerText.includes("transfer"))) ||
          (lowerText.includes("do you want to proceed") && (lowerText.includes("deposit") || lowerText.includes("payment") || lowerText.includes("purchase") || lowerText.includes("transaction") || lowerText.includes("transfer"))) ||
          (lowerText.includes("confirm") && (lowerText.includes("deposit") || lowerText.includes("payment") || lowerText.includes("purchase") || lowerText.includes("transaction") || lowerText.includes("transfer"))) ||
          (lowerText.includes("would you like to download") && lowerText.includes("statement")) ||
          (lowerText.includes("download it now"))
        )) {
          botMessage.quickReplies = ["Yes", "No"];
        }
        
        setChatLog((l) => [...l, botMessage]);
        
        if (data.transaction || data.new_balance !== undefined) {
          console.log('💰 Transaction processed, refreshing balance...');
          setBalance(data.new_balance);
        }
        
        // Handle statement download
        if (data.statement) {
          const statementType = data.statement.type || 'all';
          console.log('📄 Statement ready, triggering download for period:', data.statement.period, 'type:', statementType);
          // Fetch the statement with auth header, then create a blob download
          const typeParam = statementType !== 'all' ? `&type=${statementType}` : '';
          fetch(`/api/statement?period=${data.statement.period}&format=pdf${typeParam}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
            .then(res => res.blob())
            .then(blob => {
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              const typeLabel = statementType !== 'all' ? `-${statementType}` : '';
              link.download = `statement-${data.statement.period}${typeLabel}-${new Date().toISOString().split('T')[0]}.pdf`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            })
            .catch(err => console.error('Download error:', err));
        }
      })
      .catch(err => {
        console.error(err);
        setChatLog((l) => [...l, { from: "bot", text: "An error occurred." }]);
      })
      .finally(() => {
        setIsSending(false);
      });
  }

  // Handler for shortcut buttons - sends message immediately
  function handleShortcut(message) {
    if (isSending) return;
    handleQuickReply(message);
  }

  async function sendChat(e) {
    e?.preventDefault();
    if (!chatInput.trim() || isSending) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatLog((l) => [...l, { from: "user", text: userMsg }]);
    setIsSending(true);

    const history = chatLog.slice(-10).map((msg) => ({
      role: msg.from === "user" ? "user" : "assistant",
      content: msg.text,
    }));

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: userMsg, conversationHistory: history }),
      });
      if (!res.ok) {
        setChatLog((l) => [...l, { from: "bot", text: "Sorry, I couldn't reach the chatbot service." }]);
        return;
      }
      const data = await res.json();
      const botMessage = { from: "bot", text: data.reply || "No response." };
      
      // Detect confirmation/verification questions for:
      // 1. Transaction confirmations (deposit, payment, purchase, transfer)
      // 2. Statement download confirmations
      const lowerText = botMessage.text.toLowerCase();
      if (lowerText.includes("?") && (
        lowerText.includes("are you sure") ||
        lowerText.includes("do you confirm") ||
        (lowerText.includes("would you like to proceed") && (lowerText.includes("deposit") || lowerText.includes("payment") || lowerText.includes("purchase") || lowerText.includes("transaction") || lowerText.includes("transfer"))) ||
        (lowerText.includes("do you want to proceed") && (lowerText.includes("deposit") || lowerText.includes("payment") || lowerText.includes("purchase") || lowerText.includes("transaction") || lowerText.includes("transfer"))) ||
        (lowerText.includes("confirm") && (lowerText.includes("deposit") || lowerText.includes("payment") || lowerText.includes("purchase") || lowerText.includes("transaction") || lowerText.includes("transfer"))) ||
        (lowerText.includes("would you like to download") && lowerText.includes("statement")) ||
        (lowerText.includes("download it now"))
      )) {
        botMessage.quickReplies = ["Yes", "No"];
      }
      
      setChatLog((l) => [...l, botMessage]);
      
      if (data.transaction || data.new_balance !== undefined) {
        console.log('💰 Transaction processed, refreshing balance...');
        setBalance(data.new_balance);
      }
      
      // Handle statement download
      if (data.statement) {
        const statementType = data.statement.type || 'all';
        console.log('📄 Statement ready, triggering download for period:', data.statement.period, 'type:', statementType);
        // Fetch the statement with auth header, then create a blob download
        const typeParam = statementType !== 'all' ? `&type=${statementType}` : '';
        fetch(`/api/statement?period=${data.statement.period}&format=pdf${typeParam}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(res => res.blob())
          .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const typeLabel = statementType !== 'all' ? `-${statementType}` : '';
            link.download = `statement-${data.statement.period}${typeLabel}-${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          })
          .catch(err => console.error('Download error:', err));
      }
    } catch (err) {
      console.error(err);
      setChatLog((l) => [...l, { from: "bot", text: "An error occurred." }]);
    } finally {
      setIsSending(false);
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-black">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8">
          <div className="flex justify-center mb-6">
            <Image src="/next.svg" alt="TechTrove" width={120} height={24} className="dark:invert" />
          </div>
          <h1 className="text-3xl font-bold text-center mb-2 text-slate-900 dark:text-white">Welcome to TechTrove</h1>
          <p className="text-center text-slate-600 dark:text-slate-400 mb-8">Sign in to access your AI assistant</p>
          <form onSubmit={login} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Username</label>
              <input 
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition"
                value={loginUser} 
                onChange={(e) => setLoginUser(e.target.value)}
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Password</label>
              <input 
                type="password" 
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition"
                value={loginPass} 
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="Enter password"
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg shadow-lg transition transform hover:scale-[1.02]"
            >
              Sign In
            </button>
            <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-4">
              Demo: username: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">demo</code> / password: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">password</code>
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 relative overflow-hidden">
      {/* Persistent animated background */}
      <div className="absolute inset-0 z-0 bg-purple-950/10 dark:bg-purple-950/10 bg-[radial-gradient(ellipse_20%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_20%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
      <RetroGrid
        angle={65}
        cellSize={60}
        opacity={0.2}
        lightLineColor="#6b7280"
        darkLineColor="#374151"
        className="z-0"
      />
      
      <div className="flex flex-col w-full h-screen relative z-10">
        {chatLog.length > 0 && (
          <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <Image src="/next.svg" alt="TechTrove" width={100} height={20} className="dark:invert" />
              <span className="text-xl font-semibold text-slate-900 dark:text-white">TechTrove AI</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-lg shadow">
              <div className="text-right">
                <p className="text-xs opacity-90">{user?.username ?? "demo"}</p>
                <p className="text-lg font-bold">{formatCurrency(balance)}</p>
              </div>
            </div>
          </header>
        )}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col">
            {/* Hero content with fade transition */}
            <div className={`absolute inset-0 z-20 flex items-center justify-center transition-all duration-1000 ease-out ${showHero && chatLog.length === 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
              <div className="w-full max-w-3xl px-4 md:px-8 text-center space-y-5">
                <h1 className="text-sm text-gray-600 dark:text-gray-400 group font-geist mx-auto px-5 py-2 bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 border-[2px] border-black/5 dark:border-white/5 rounded-3xl w-fit">
                  Welcome to TechTrove Banking
                  <svg className="inline w-4 h-4 ml-2 group-hover:translate-x-1 duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </h1>
                <h2 className="text-4xl tracking-tighter font-geist bg-clip-text text-transparent mx-auto md:text-6xl bg-[linear-gradient(180deg,_#000_0%,_rgba(0,_0,_0,_0.75)_100%)] dark:bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]">
                  Your AI-powered{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-300 dark:to-orange-200">
                    banking assistant
                  </span>
                </h2>
                <p className="max-w-2xl mx-auto text-gray-600 dark:text-gray-300">
                  Experience seamless banking with intelligent conversations. Check balances, make payments, transfer money to other users, and download statements - all in Malaysian Ringgit (RM).
                </p>
                <div className="items-center justify-center gap-x-3 space-y-3 sm:flex sm:space-y-0">
                  <span className="relative inline-block overflow-hidden rounded-full p-[1.5px]">
                    <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
                    <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-white dark:bg-gray-950 text-xs font-medium backdrop-blur-3xl">
                      <button
                        onClick={() => setShowHero(false)}
                        className="inline-flex rounded-full text-center group items-center w-full justify-center bg-gradient-to-tr from-zinc-300/20 via-purple-400/30 to-transparent dark:from-zinc-300/5 dark:via-purple-400/20 text-gray-900 dark:text-white border-input border-[1px] hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/40 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/30 transition-all sm:w-auto py-4 px-10"
                      >
                        Get Started
                      </button>
                    </div>
                  </span>
                </div>
              </div>
            </div>

            {/* Chat interface */}
            {chatLog.length === 0 && !showHero ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center max-w-2xl w-full">
                  <div className="text-6xl mb-4">💬</div>
                  <p className="text-slate-600 dark:text-slate-300 mb-8">Start a conversation or try a quick action...</p>
                  
                  {/* Shortcut buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleShortcut("What's my current balance?")}
                      className="p-4 text-left border border-slate-200/50 dark:border-slate-700/50 rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition backdrop-blur-sm group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">💰</div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">Check Balance</div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">View your current balance</div>
                        </div>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => handleShortcut("I want to make a transaction")}
                      className="p-4 text-left border border-slate-200/50 dark:border-slate-700/50 rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition backdrop-blur-sm group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">🛒</div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">Make Transaction</div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">Pay for purchases or bills</div>
                        </div>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => handleShortcut("I want to transfer money")}
                      className="p-4 text-left border border-slate-200/50 dark:border-slate-700/50 rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition backdrop-blur-sm group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">💸</div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">Transfer Money</div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">Send money to another user</div>
                        </div>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => handleShortcut("Download my statement")}
                      className="p-4 text-left border border-slate-200/50 dark:border-slate-700/50 rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition backdrop-blur-sm group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">📄</div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">Check Statement</div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">Download transaction history</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            ) : chatLog.length > 0 ? (
              <div className="flex-1 overflow-y-auto px-4 py-6">
                <div className="max-w-3xl mx-auto space-y-6">
                  {chatLog.map((c, i) => (
                    <div key={i} className={`flex ${c.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex gap-3 max-w-2xl ${c.from === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg ${c.from === 'user' ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                          {c.from === 'user' ? '👤' : '🤖'}
                        </div>
                        <div>
                          <div className={`px-4 py-3 rounded-2xl ${c.from === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'}`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {c.from === 'bot' && i === chatLog.length - 1 ? (
                                <TypingText text={c.text} speed={20} />
                              ) : (
                                c.text
                              )}
                            </p>
                          </div>
                          {c.quickReplies && c.from === 'bot' && i === chatLog.length - 1 && !isSending && (
                            <div className="flex gap-2 mt-2">
                              {c.quickReplies.map((reply, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleQuickReply(reply)}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition shadow-sm"
                                >
                                  {reply}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isSending && (
                    <div className="flex justify-start">
                      <div className="flex gap-3 max-w-2xl">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-lg">🤖</div>
                        <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>
            ) : null}
            
            {/* Input area - always visible after Get Started */}
            {!showHero && (
              <div className="border-t border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-4">
                <form onSubmit={sendChat} className="max-w-3xl mx-auto">
                  <div className="flex gap-3 items-end">
                    <div className="flex-1 relative">
                      <textarea
                        ref={inputRef}
                        className="w-full px-4 py-3 pr-12 border border-slate-300 dark:border-slate-600 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white resize-none transition"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendChat(e);
                          }
                        }}
                        placeholder="Message TechTrove AI..."
                        disabled={isSending}
                        rows={1}
                        style={{ minHeight: '52px', maxHeight: '200px' }}
                        onInput={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSending || !chatInput.trim()}
                      className="flex-shrink-0 w-12 h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl shadow-lg transition flex items-center justify-center text-xl"
                    >
                      {isSending ? '⏳' : '➤'}
                    </button>
                  </div>
                  <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-2">Press Enter to send, Shift+Enter for new line</p>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
