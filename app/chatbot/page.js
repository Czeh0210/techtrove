"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AIAssistantCard } from "@/components/ui/ai-assistant-card";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, LogOut } from "lucide-react";

function formatCurrency(n) {
  return "RM " + Number(n).toLocaleString("ms-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ChatbotPage() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loginUser, setLoginUser] = useState("demo");
  const [loginPass, setLoginPass] = useState("");
  const [conversationHistory, setConversationHistory] = useState([]);

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadUser();
      loadBalance();
    }
  }, [token]);

  async function loadUser() {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        // Update localStorage with displayName once we have it
        localStorage.setItem('userName', data.displayName || data.username);
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
      // Save token to localStorage
      localStorage.setItem('authToken', data.token);
      // Save username (we'll get displayName from /api/auth/me after)
      localStorage.setItem('userName', loginUser);
    } else {
      alert("Login failed");
    }
  }

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
    setToken(null);
    setUser(null);
    setConversationHistory([]);
  };

  async function loadBalance() {
    const res = await fetch(`/api/transactions`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      setBalance(data.balance ?? 0);
    }
  }

  // Handler for sending messages from AI Assistant Card
  async function handleSendMessage(message) {
    if (!message.trim()) return;
    
    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          message: message, 
          conversationHistory: conversationHistory 
        }),
      });
      
      if (!res.ok) {
        console.error("Chatbot service error");
        return { error: "Service error" };
      }
      
      const data = await res.json();
      
      // Update conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: message },
        { role: 'assistant', content: data.reply || data.message || "Request processed successfully." }
      ]);
      
      if (data.transaction || data.new_balance !== undefined) {
        console.log('💰 Transaction processed, refreshing balance...');
        setBalance(data.new_balance);
      }
      
      // Handle redirect to dashboard for transaction history
      if (data.redirect) {
        console.log('🔄 Redirect available to:', data.redirect);
        // Store the period filter in localStorage so dashboard can use it
        if (data.period) {
          localStorage.setItem('dashboardPeriod', data.period);
        }
        // Return the reply with redirect action attached
        return { 
          reply: data.reply || data.message || "Let me take you to the dashboard.",
          redirect: data.redirect,
          redirectLabel: "Go to Dashboard 📊"
        };
      }
      
      // Handle statement download
      if (data.statement) {
        const statementType = data.statement.type || 'all';
        console.log('📄 Statement ready, triggering download for period:', data.statement.period, 'type:', statementType);
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
      
      // Return the assistant's response
      return { reply: data.reply || data.message || "Request processed successfully." };
    } catch (err) {
      console.error("Error sending message:", err);
      return { error: "Failed to send message" };
    }
  }

  // Map banking prompts to actual queries
  const promptMapping = {
    "Check Balance": "What's my current balance?",
    "Transfer Money": "I want to transfer money",
    "Make Payment": "I want to make a transaction",
    "View Transactions": "Show me my recent transactions",
    "Download Statement": "Download my monthly statement",
    "Help": "What can you help me with?"
  };

  async function handlePromptClick(prompt) {
    const mappedMessage = promptMapping[prompt] || prompt;
    return await handleSendMessage(mappedMessage);
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
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-black">
      {/* Dashboard and Logout Links */}
      <div className="fixed top-6 right-6 z-50 flex gap-2">
        <Link href="/dashboard">
          <Button className="gap-2 shadow-lg hover:shadow-xl transition-all">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Button>
        </Link>
        <Button 
          variant="outline" 
          className="gap-2 shadow-lg hover:shadow-xl transition-all"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
      
      <div className="relative w-full max-w-7xl">
        <AIAssistantCard 
          userName={user?.displayName || user?.username || "User"}
          onPromptClick={handlePromptClick}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}
