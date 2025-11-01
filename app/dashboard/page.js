"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { ArrowUpRight, ArrowDownLeft, DollarSign, TrendingUp, TrendingDown, Calendar, Download } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [timeFilter, setTimeFilter] = useState('day'); // day, week, month, 6months
  const [selectedCard, setSelectedCard] = useState('all'); // 'all' or card accountNumber
  const [loading, setLoading] = useState(true);
  const [cashFlow, setCashFlow] = useState({
    cashIn: 0,
    cashOut: 0,
    total: 0
  });

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (userId) {
      loadTransactions();
    }
  }, [userId, timeFilter, selectedCard]);

  const checkSession = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      
      if (!sessionId) {
        router.push('/auth');
        return;
      }

      const res = await fetch('/api/auth/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      if (!res.ok) {
        router.push('/auth');
        return;
      }

      const data = await res.json();
      if (data.valid && data.session?.userId) {
        setUserId(data.session.userId);
        await loadUserCards(data.session.userId);
      } else {
        router.push('/auth');
      }
    } catch (error) {
      console.error('Session check failed:', error);
      router.push('/auth');
    }
  };

  const loadUserCards = async (uid) => {
    try {
      const res = await fetch(`/api/cards/list?userId=${uid}`);
      const data = await res.json();
      if (data.ok && data.cards.length > 0) {
        setCards(data.cards);
      }
    } catch (error) {
      console.error('Failed to load cards:', error);
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      // Get all transactions for the user
      const res = await fetch(`/api/cards/transaction-history?userId=${userId}&limit=100`);
      const data = await res.json();
      
      if (data.ok && data.transactions) {
        // Filter transactions by time period
        const filteredTransactions = filterTransactionsByTime(data.transactions);
        setTransactions(filteredTransactions);

        // Calculate cash flow
        calculateCashFlow(filteredTransactions);
      } else {
        setTransactions([]);
        setCashFlow({ cashIn: 0, cashOut: 0, total: 0 });
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
      setTransactions([]);
      setCashFlow({ cashIn: 0, cashOut: 0, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  const filterTransactionsByTime = (transactions) => {
    const now = new Date();
    const filtered = transactions.filter(tx => {
      const txDate = new Date(tx.timestamp);
      
      switch(timeFilter) {
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

    return filtered;
  };

  const calculateCashFlow = (transactions) => {
    let cashIn = 0;
    let cashOut = 0;

    transactions.forEach(tx => {
      // If a specific card is selected, only count transactions for that card
      if (selectedCard !== 'all') {
        if (tx.senderCardNumber === selectedCard) {
          cashOut += tx.amount;
        }
        if (tx.recipientCardNumber === selectedCard) {
          cashIn += tx.amount;
        }
      } else {
        // All cards - use userId
        if (tx.senderUserId === userId) {
          cashOut += tx.amount;
        }
        if (tx.recipientUserId === userId) {
          cashIn += tx.amount;
        }
      }
    });

    setCashFlow({
      cashIn,
      cashOut,
      total: cashIn - cashOut
    });
  };

  const getTimeFilterLabel = () => {
    switch(timeFilter) {
      case 'day': return 'Today';
      case 'week': return 'Last 7 Days';
      case 'month': return 'Last 30 Days';
      case '6months': return 'Last 6 Months';
      default: return 'All Time';
    }
  };

  const renderPieChart = () => {
    // Calculate cash flow for the selected card/all cards
    let cashIn = 0;
    let cashOut = 0;
    
    transactions.forEach(tx => {
      if (selectedCard !== 'all') {
        // Specific card selected
        if (tx.senderCardNumber === selectedCard) {
          cashOut += tx.amount;
        }
        if (tx.recipientCardNumber === selectedCard) {
          cashIn += tx.amount;
        }
      } else {
        // All cards - use userId
        if (tx.senderUserId === userId) {
          cashOut += tx.amount;
        }
        if (tx.recipientUserId === userId) {
          cashIn += tx.amount;
        }
      }
    });
    
    const total = cashIn + cashOut;
    
    // Calculate balance based on selected card or all cards
    let totalBalance = 0;
    let cardLabel = '';
    
    if (selectedCard === 'all') {
      totalBalance = cards.reduce((sum, card) => sum + (card.balance || 0), 0);
      cardLabel = `${cards.length} Card${cards.length !== 1 ? 's' : ''}`;
    } else {
      const card = cards.find(c => c.accountNumber === selectedCard);
      totalBalance = card?.balance || 0;
      cardLabel = card?.name || 'Card';
    }
    
    if (total === 0) {
      // No cash flow - show yellow circle
      return (
        <div className="relative w-48 h-48 mx-auto">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="80"
              fill="none"
              stroke="#facc15"
              strokeWidth="32"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-xs text-zinc-400 mb-1">Balance</p>
              <p className="text-2xl font-bold text-gray-900">RM{totalBalance.toFixed(2)}</p>
              <p className="text-xs text-yellow-400 mt-1">No Flow</p>
              <p className="text-xs text-zinc-500 mt-1">{cardLabel}</p>
            </div>
          </div>
        </div>
      );
    }

    const cashInPercent = (cashIn / total) * 100;
    const cashOutPercent = (cashOut / total) * 100;
    
    // Calculate circle segments
    const circumference = 2 * Math.PI * 80;
    const cashInLength = (cashInPercent / 100) * circumference;
    const cashOutLength = (cashOutPercent / 100) * circumference;
    
    // Calculate net flow
    const netFlow = cashIn - cashOut;

    return (
      <div className="relative w-48 h-48 mx-auto">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="96"
            cy="96"
            r="80"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="32"
          />
          {/* Cash In (Green) - starts at top */}
          <circle
            cx="96"
            cy="96"
            r="80"
            fill="none"
            stroke="#10b981"
            strokeWidth="32"
            strokeDasharray={`${cashInLength} ${circumference}`}
            strokeDashoffset="0"
          />
          {/* Cash Out (Red) - continues after green */}
          <circle
            cx="96"
            cy="96"
            r="80"
            fill="none"
            stroke="#ef4444"
            strokeWidth="32"
            strokeDasharray={`${cashOutLength} ${circumference}`}
            strokeDashoffset={`-${cashInLength}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Balance</p>
            <p className="text-2xl font-bold text-gray-900">RM{totalBalance.toFixed(2)}</p>
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500">Net Flow</p>
              <p className={`text-sm font-semibold ${netFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {netFlow >= 0 ? '+' : ''}RM{netFlow.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const downloadPDF = () => {
    // Filter transactions based on current filters
    const filteredTx = transactions.filter(tx => {
      if (selectedCard && selectedCard !== 'all') {
        return tx.senderCardNumber === selectedCard || tx.recipientCardNumber === selectedCard;
      }
      return true;
    });

    // Get card info
    let cardInfo = 'All Cards';
    let accountInfo = '';
    if (selectedCard !== 'all') {
      const card = cards.find(c => c.accountNumber === selectedCard);
      if (card) {
        cardInfo = card.name;
        accountInfo = `Account: ${card.accountNumber}`;
      }
    } else {
      accountInfo = `Total Cards: ${cards.length}`;
    }

    // Create PDF content
    const pageWidth = 210; // A4 width in mm
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    let yPos = margin;
    const lineHeight = 7;
    
    // Create HTML for PDF
    const pdfContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Transaction Statement</title>
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
      <span class="info-value">${getTimeFilterLabel()}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Account:</span>
      <span class="info-value">${cardInfo}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${accountInfo.split(':')[0]}:</span>
      <span class="info-value">${accountInfo.split(':')[1] || ''}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Generated:</span>
      <span class="info-value">${new Date().toLocaleString()}</span>
    </div>
  </div>

  <div class="summary-cards">
    <div class="summary-card cash-in">
      <h3>Cash In</h3>
      <p>RM${cashFlow.cashIn.toFixed(2)}</p>
    </div>
    <div class="summary-card cash-out">
      <h3>Cash Out</h3>
      <p>RM${cashFlow.cashOut.toFixed(2)}</p>
    </div>
    <div class="summary-card net">
      <h3>Net Flow</h3>
      <p>RM${cashFlow.total.toFixed(2)}</p>
    </div>
  </div>

  <div class="transactions-header">
    Transaction History (${filteredTx.length} transactions)
  </div>
  
  ${filteredTx.length > 0 ? `
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
        ${filteredTx.map(tx => {
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

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    printWindow.document.write(pdfContent);
    printWindow.document.close();
    
    // Wait for content to load, then trigger print
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  function handleLogout() {
    try { 
      window.localStorage.removeItem("faceAttempts"); 
      window.localStorage.removeItem("sessionId");
    } catch {}
    router.push("/");
  }

  if (loading && !userId) {
    return (
      <div className="min-h-screen w-full bg-zinc-50 dark:bg-black flex items-center justify-center">
        <div className="text-zinc-900 dark:text-zinc-50">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Enhanced Gradient Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"></div>
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-violet-400/20 to-purple-400/20 rounded-full blur-3xl animate-aurora-1"></div>
        <div className="absolute top-1/4 right-0 w-[700px] h-[700px] bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-aurora-2"></div>
        <div className="absolute bottom-0 left-1/3 w-[650px] h-[650px] bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl animate-aurora-3"></div>
        <div className="absolute top-1/2 right-1/4 w-[550px] h-[550px] bg-gradient-to-br from-pink-400/20 to-rose-400/20 rounded-full blur-3xl animate-aurora-4"></div>
      </div>

      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-8 max-w-7xl relative z-10">
        {/* Header with Aurora Glow */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3 drop-shadow-lg">
            Cash Flow Dashboard
          </h1>
          <p className="text-gray-700 text-lg">Track your financial journey with real-time insights</p>
        </div>

        {/* Time Filter with Light Aurora Design */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-indigo-200 p-6 mb-6 shadow-xl hover:shadow-purple-300/50 transition-all duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg">
              <Calendar className="w-6 h-6 text-indigo-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Time Period</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: 'day', label: 'Today', icon: '☀️' },
              { value: 'week', label: 'Last 7 Days', icon: '📅' },
              { value: 'month', label: 'Last 30 Days', icon: '📊' },
              { value: '6months', label: 'Last 6 Months', icon: '📈' }
            ].map(filter => (
              <button
                key={filter.value}
                onClick={() => setTimeFilter(filter.value)}
                className={`group px-5 py-3 rounded-xl font-medium transition-all duration-300 relative overflow-hidden ${
                  timeFilter === filter.value
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-gray-900 shadow-lg shadow-indigo-300/50 scale-105'
                    : 'bg-white/60 text-gray-700 hover:bg-white/90 border border-indigo-200/50'
                }`}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <span>{filter.icon}</span>
                  <span>{filter.label}</span>
                </span>
                {timeFilter === filter.value && (
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 blur-xl"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Cash Flow Summary with Aurora Gradients */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Cash In */}
          <div className="group relative bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-emerald-300/50 hover:border-emerald-400 transition-all duration-300 hover:scale-105 hover:shadow-emerald-300/50">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/50 to-cyan-100/50 rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-emerald-100 to-cyan-100 rounded-xl">
                  <ArrowDownLeft className="w-7 h-7 text-emerald-600" />
                </div>
                <TrendingUp className="w-10 h-10 text-emerald-400/40" />
              </div>
              <h3 className="text-emerald-700 text-sm font-medium mb-2">Cash In</h3>
              <p className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
                RM{cashFlow.cashIn.toFixed(2)}
              </p>
              <p className="text-emerald-600/70 text-xs mt-3 flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                {getTimeFilterLabel()}
              </p>
            </div>
          </div>

          {/* Cash Out */}
          <div className="group relative bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-rose-300/50 hover:border-rose-400 transition-all duration-300 hover:scale-105 hover:shadow-rose-300/50">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-100/50 to-pink-100/50 rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-rose-100 to-pink-100 rounded-xl">
                  <ArrowUpRight className="w-7 h-7 text-rose-600" />
                </div>
                <TrendingDown className="w-10 h-10 text-rose-400/40" />
              </div>
              <h3 className="text-rose-700 text-sm font-medium mb-2">Cash Out</h3>
              <p className="text-4xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                RM{cashFlow.cashOut.toFixed(2)}
              </p>
              <p className="text-rose-600/70 text-xs mt-3 flex items-center gap-1">
                <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                {getTimeFilterLabel()}
              </p>
            </div>
          </div>

          {/* Net Flow */}
          <div className={`group relative bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl transition-all duration-300 hover:scale-105 ${
            cashFlow.total > 0 
              ? 'border border-indigo-300/50 hover:border-indigo-400 hover:shadow-indigo-300/50' 
              : cashFlow.total < 0 
              ? 'border border-orange-300/50 hover:border-orange-400 hover:shadow-orange-300/50'
              : 'border border-violet-300/50 hover:border-violet-400 hover:shadow-violet-300/50'
          }`}>
            <div className={`absolute inset-0 rounded-2xl blur-xl group-hover:blur-2xl transition-all ${
              cashFlow.total > 0 ? 'bg-gradient-to-br from-indigo-100/50 to-purple-100/50' :
              cashFlow.total < 0 ? 'bg-gradient-to-br from-orange-100/50 to-amber-100/50' :
              'bg-gradient-to-br from-violet-100/50 to-purple-100/50'
            }`}></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${
                  cashFlow.total > 0 ? 'bg-gradient-to-br from-indigo-100 to-purple-100' :
                  cashFlow.total < 0 ? 'bg-gradient-to-br from-orange-100 to-amber-100' :
                  'bg-gradient-to-br from-violet-100 to-purple-100'
                }`}>
                  <DollarSign className={`w-7 h-7 ${
                    cashFlow.total > 0 ? 'text-indigo-600' :
                    cashFlow.total < 0 ? 'text-orange-600' :
                    'text-violet-600'
                  }`} />
                </div>
              </div>
              <h3 className={`text-sm font-medium mb-2 ${
                cashFlow.total > 0 ? 'text-blue-200/90' :
                cashFlow.total < 0 ? 'text-orange-200/90' :
                'text-violet-200/90'
              }`}>Net Flow</h3>
              <p className={`text-4xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${
                cashFlow.total > 0 ? 'from-indigo-600 to-purple-600' :
                cashFlow.total < 0 ? 'from-orange-600 to-amber-600' :
                'from-violet-600 to-purple-600'
              }`}>
                {cashFlow.total >= 0 ? '+' : ''}RM{cashFlow.total.toFixed(2)}
              </p>
              <p className={`text-xs mt-3 flex items-center gap-1 ${
                cashFlow.total > 0 ? 'text-indigo-600/60' :
                cashFlow.total < 0 ? 'text-orange-600/60' :
                'text-violet-600/60'
              }`}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${
                  cashFlow.total > 0 ? 'bg-blue-400' :
                  cashFlow.total < 0 ? 'bg-orange-400' :
                  'bg-violet-400'
                }`}></span>
                {cashFlow.total > 0 ? 'Surplus ✨' : cashFlow.total < 0 ? 'Deficit ⚠️' : 'Balanced ⚖️'}
              </p>
            </div>
          </div>
        </div>

        {/* Pie Chart with Aurora Theme */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-indigo-200 p-8 mb-6 shadow-2xl hover:shadow-purple-500/10 transition-all duration-300">
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent mb-8 text-center">
            Cash Flow Distribution
          </h2>
          
          {renderPieChart()}

          {/* Legend with Aurora Colors */}
          <div className="flex flex-wrap justify-center gap-6 mt-8">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-400/20">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 animate-pulse"></div>
              <span className="text-emerald-700 text-sm font-medium">Cash In: RM{(() => {
                let cashIn = 0;
                transactions.forEach(tx => {
                  if (selectedCard !== 'all') {
                    if (tx.recipientCardNumber === selectedCard) cashIn += tx.amount;
                  } else {
                    if (tx.recipientUserId === userId) cashIn += tx.amount;
                  }
                });
                return cashIn.toFixed(2);
              })()}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 rounded-full border border-rose-400/20">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-rose-400 to-pink-400 animate-pulse"></div>
              <span className="text-rose-700 text-sm font-medium">Cash Out: RM{(() => {
                let cashOut = 0;
                transactions.forEach(tx => {
                  if (selectedCard !== 'all') {
                    if (tx.senderCardNumber === selectedCard) cashOut += tx.amount;
                  } else {
                    if (tx.senderUserId === userId) cashOut += tx.amount;
                  }
                });
                return cashOut.toFixed(2);
              })()}</span>
            </div>
            {(() => {
              let cashIn = 0, cashOut = 0;
              transactions.forEach(tx => {
                if (selectedCard !== 'all') {
                  if (tx.recipientCardNumber === selectedCard) cashIn += tx.amount;
                  if (tx.senderCardNumber === selectedCard) cashOut += tx.amount;
                } else {
                  if (tx.recipientUserId === userId) cashIn += tx.amount;
                  if (tx.senderUserId === userId) cashOut += tx.amount;
                }
              });
              return (cashIn === 0 && cashOut === 0) && (
                <div className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 rounded-full border border-violet-400/20">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-violet-400 to-purple-400 animate-pulse"></div>
                  <span className="text-violet-600 text-sm font-medium">No Flow</span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Card Balances - Simple Grid */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-indigo-200 p-6 mb-6 shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-cyan-400/20 to-purple-400/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-cyan-700" />
            </div>
            <h2 className="text-2xl font-semibold bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent">
              Card Balances
            </h2>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-12 h-12 border-4 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div>
              <p className="text-gray-600 mt-4">Loading cards...</p>
            </div>
          ) : cards.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No cards found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Overall Balance Card */}
              <button
                onClick={() => setSelectedCard('all')}
                className={`bg-gradient-to-br from-indigo-100/50 to-purple-100/50 backdrop-blur-sm rounded-2xl p-6 border transition-all duration-300 ${
                  selectedCard === 'all' 
                    ? 'border-indigo-400 shadow-lg shadow-indigo-300/50 scale-[1.02]' 
                    : 'border-indigo-200 hover:border-indigo-300 hover:shadow-lg'
                }`}
              >
                <div className="flex flex-col h-full justify-between min-h-[180px]">
                  <div className="text-left">
                    <p className="text-indigo-600 text-sm mb-2">Overall Balance</p>
                    <p className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      RM{cards.reduce((sum, card) => sum + (card.balance || 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="p-3 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl">
                      <DollarSign className="w-10 h-10 text-indigo-600" />
                    </div>
                    <div className="text-right">
                      <p className="text-indigo-600 text-xs">
                        {cards.length} Card{cards.length !== 1 ? 's' : ''}
                      </p>
                      {selectedCard === 'all' && (
                        <span className="text-indigo-700 font-semibold text-xs flex items-center gap-1 mt-1">
                          <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                          Selected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>

              {/* Individual Cards */}
              {cards.map((card, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedCard(card.accountNumber)}
                  className={`backdrop-blur-sm rounded-2xl p-6 border transition-all duration-300 text-left ${
                    selectedCard === card.accountNumber
                      ? 'bg-gradient-to-br from-purple-100/70 to-pink-100/70 border-purple-400 shadow-lg shadow-purple-300/50 scale-[1.02]'
                      : 'bg-white/70 border-indigo-200 hover:border-indigo-300 hover:bg-white/80 hover:shadow-lg'
                  }`}
                >
                  <div className="flex flex-col h-full justify-between min-h-[180px]">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-900 font-semibold text-lg">{card.name}</p>
                      </div>
                      <span className="text-xs text-gray-600 bg-indigo-100 px-3 py-1.5 rounded-full border border-indigo-200 inline-block">
                        {card.bank || 'Bank'}
                      </span>
                      <p className="text-gray-500 text-sm mt-3">****{card.accountNumber.slice(-4)}</p>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        RM{(card.balance || 0).toFixed(2)}
                      </p>
                      {selectedCard === card.accountNumber && (
                        <span className="text-purple-700 text-sm font-semibold flex items-center gap-1">
                          <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
                          Selected
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions with Aurora Theme */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-indigo-200 p-6 shadow-2xl hover:shadow-purple-500/10 transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-lg">
                <ArrowUpRight className="w-6 h-6 text-purple-700" />
              </div>
              <h2 className="text-2xl font-semibold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                Recent Transactions
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {selectedCard && selectedCard !== 'all' && (
                <span className="text-sm text-purple-700 px-3 py-1.5 bg-purple-500/20 rounded-full border border-purple-400/30">
                  {cards.find(c => c.accountNumber === selectedCard)?.name || 'Selected Card'}
                </span>
              )}
              <span className="text-xs text-gray-600 bg-white/80 px-3 py-1.5 rounded-full border border-indigo-300">
                {transactions.filter(tx => {
                  if (selectedCard && selectedCard !== 'all') {
                    return tx.senderCardNumber === selectedCard || tx.recipientCardNumber === selectedCard;
                  }
                  return true;
                }).length} transactions
              </span>
              <button
                onClick={downloadPDF}
                className="group flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-gray-900 text-sm px-4 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-purple-500/50 hover:scale-105"
                title="Download statement as PDF"
              >
                <Download className="w-4 h-4 group-hover:animate-bounce" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-12 h-12 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin"></div>
              <p className="text-gray-600 mt-4">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full flex items-center justify-center">
                <Calendar className="w-10 h-10 text-purple-700" />
              </div>
              <p className="text-gray-600">No transactions found for this period</p>
            </div>
          ) : (
            (() => {
              const filteredTx = transactions.filter(tx => {
                if (selectedCard && selectedCard !== 'all') {
                  return tx.senderCardNumber === selectedCard || tx.recipientCardNumber === selectedCard;
                }
                return true;
              });
              
              return filteredTx.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full flex items-center justify-center">
                    <DollarSign className="w-10 h-10 text-purple-700" />
                  </div>
                  <p className="text-gray-600">No transactions found for this card</p>
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-purple-400 scrollbar-track-indigo-100">
                  {filteredTx.map((tx, idx) => {
                    const isIncoming = tx.recipientUserId === userId;
                    
                    return (
                      <div key={idx} className={`backdrop-blur-sm rounded-xl p-4 flex items-center justify-between transition-all duration-300 border ${
                        isIncoming 
                          ? 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-400/20 hover:border-emerald-400/40' 
                          : 'bg-rose-500/5 hover:bg-rose-500/10 border-rose-400/20 hover:border-rose-400/40'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl backdrop-blur-sm ${
                            isIncoming 
                              ? 'bg-gradient-to-br from-emerald-400/30 to-cyan-400/30' 
                              : 'bg-gradient-to-br from-rose-400/30 to-pink-400/30'
                          }`}>
                            {isIncoming ? (
                              <ArrowDownLeft className="w-5 h-5 text-emerald-700" />
                            ) : (
                              <ArrowUpRight className="w-5 h-5 text-rose-700" />
                            )}
                          </div>
                          <div>
                            <p className="text-gray-900 font-medium">
                              {isIncoming ? `From ${tx.senderName}` : `To ${tx.recipientName}`}
                            </p>
                            <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(tx.timestamp).toLocaleDateString()} {new Date(tx.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${
                            isIncoming 
                              ? 'from-emerald-600 to-cyan-600' 
                              : 'from-rose-600 to-pink-600'
                          }`}>
                            {isIncoming ? '+' : '-'}RM{tx.amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>

        {/* Logout Button with Aurora */}
        <div className="mt-8">
          <button
            type="button"
            onClick={handleLogout}
            className="group w-full rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 px-6 py-4 text-base font-semibold text-gray-900 transition-all shadow-lg hover:shadow-rose-500/50 hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <span>Log out</span>
            <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}


