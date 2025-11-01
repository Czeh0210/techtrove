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
    const total = cashFlow.cashIn + cashFlow.cashOut;
    
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
              <p className="text-2xl font-bold text-white">RM{totalBalance.toFixed(2)}</p>
              <p className="text-xs text-yellow-400 mt-1">No Flow</p>
              <p className="text-xs text-zinc-500 mt-1">{cardLabel}</p>
            </div>
          </div>
        </div>
      );
    }

    const cashInPercent = (cashFlow.cashIn / total) * 100;
    const cashOutPercent = (cashFlow.cashOut / total) * 100;
    
    // Calculate circle segments
    const circumference = 2 * Math.PI * 80;
    const cashInLength = (cashInPercent / 100) * circumference;
    const cashOutLength = (cashOutPercent / 100) * circumference;

    return (
      <div className="relative w-48 h-48 mx-auto">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="96"
            cy="96"
            r="80"
            fill="none"
            stroke="#1f2937"
            strokeWidth="32"
          />
          {/* Cash In (Green) - starts at top */}
          <circle
            cx="96"
            cy="96"
            r="80"
            fill="none"
            stroke="#22c55e"
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
            <p className="text-xs text-zinc-300 mb-1">Balance</p>
            <p className="text-2xl font-bold text-white">RM{totalBalance.toFixed(2)}</p>
            <p className="text-xs text-zinc-400 mt-1">{cardLabel}</p>
            <div className="flex gap-2 mt-2 text-xs">
              <span className="text-green-400">{cashInPercent.toFixed(0)}%</span>
              <span className="text-zinc-500">|</span>
              <span className="text-red-400">{cashOutPercent.toFixed(0)}%</span>
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
    <h1>🏦 TechTrove Banking</h1>
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
    <p>TechTrove Banking © ${new Date().getFullYear()} • Confidential Document</p>
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
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Cash Flow Dashboard</h1>
          <p className="text-white/70">Track your income and expenses</p>
        </div>

        {/* Time Filter */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-white" />
            <h2 className="text-lg font-semibold text-white">Time Period</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: 'day', label: 'Today' },
              { value: 'week', label: 'Last 7 Days' },
              { value: 'month', label: 'Last 30 Days' },
              { value: '6months', label: 'Last 6 Months' }
            ].map(filter => (
              <button
                key={filter.value}
                onClick={() => setTimeFilter(filter.value)}
                className={`px-4 py-2.5 rounded-lg font-medium transition-all ${
                  timeFilter === filter.value
                    ? 'bg-purple-600 text-white shadow-lg scale-105'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cash Flow Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Cash In */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-3 rounded-lg">
                <ArrowDownLeft className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-8 h-8 text-white/40" />
            </div>
            <h3 className="text-white/90 text-sm font-medium mb-1">Cash In</h3>
            <p className="text-3xl font-bold text-white">RM{cashFlow.cashIn.toFixed(2)}</p>
            <p className="text-white/70 text-xs mt-2">{getTimeFilterLabel()}</p>
          </div>

          {/* Cash Out */}
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-3 rounded-lg">
                <ArrowUpRight className="w-6 h-6 text-white" />
              </div>
              <TrendingDown className="w-8 h-8 text-white/40" />
            </div>
            <h3 className="text-white/90 text-sm font-medium mb-1">Cash Out</h3>
            <p className="text-3xl font-bold text-white">RM{cashFlow.cashOut.toFixed(2)}</p>
            <p className="text-white/70 text-xs mt-2">{getTimeFilterLabel()}</p>
          </div>

          {/* Net Flow */}
          <div className={`bg-gradient-to-br ${
            cashFlow.total > 0 ? 'from-blue-500 to-blue-600' : 
            cashFlow.total < 0 ? 'from-orange-500 to-orange-600' : 
            'from-yellow-500 to-yellow-600'
          } rounded-xl p-6 shadow-xl`}>
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-white/90 text-sm font-medium mb-1">Net Flow</h3>
            <p className="text-3xl font-bold text-white">
              {cashFlow.total >= 0 ? '+' : ''}RM{cashFlow.total.toFixed(2)}
            </p>
            <p className="text-white/70 text-xs mt-2">
              {cashFlow.total > 0 ? 'Surplus' : cashFlow.total < 0 ? 'Deficit' : 'Balanced'}
            </p>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">Cash Flow Distribution</h2>
          
          {renderPieChart()}

          {/* Legend */}
          <div className="flex justify-center gap-6 mt-8">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="text-white text-sm">Cash In: RM{cashFlow.cashIn.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span className="text-white text-sm">Cash Out: RM{cashFlow.cashOut.toFixed(2)}</span>
            </div>
            {cashFlow.cashIn === 0 && cashFlow.cashOut === 0 && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                <span className="text-white text-sm">No Flow</span>
              </div>
            )}
          </div>
        </div>

        {/* Card Balances */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Card Balances</h2>
          
          {/* Overall Balance */}
          <button
            onClick={() => setSelectedCard('all')}
            className={`w-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-4 mb-4 border transition-all ${
              selectedCard === 'all' 
                ? 'border-blue-400 shadow-lg shadow-blue-500/20 scale-105' 
                : 'border-blue-400/30 hover:border-blue-400/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-white/70 text-sm mb-1">Overall Balance</p>
                <p className="text-3xl font-bold text-white">
                  RM{cards.reduce((sum, card) => sum + (card.balance || 0), 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-white/10 p-3 rounded-lg">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
            </div>
            <p className="text-white/60 text-xs mt-2 text-left">
              {cards.length} Card{cards.length !== 1 ? 's' : ''} Total
              {selectedCard === 'all' && <span className="ml-2 text-blue-400">✓ Selected</span>}
            </p>
          </button>

          {/* Individual Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cards.length === 0 ? (
              <p className="text-white/70 text-center py-4 col-span-2">No cards found</p>
            ) : (
              cards.map((card, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedCard(card.accountNumber)}
                  className={`bg-white/5 rounded-lg p-4 border transition-all text-left ${
                    selectedCard === card.accountNumber
                      ? 'border-purple-400 shadow-lg shadow-purple-500/20 scale-105 bg-white/10'
                      : 'border-white/10 hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-semibold">{card.name}</p>
                    <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded">
                      {card.bank || 'Bank'}
                    </span>
                  </div>
                  <p className="text-white/60 text-sm mb-2">****{card.accountNumber.slice(-4)}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold text-white">
                      RM{(card.balance || 0).toFixed(2)}
                    </p>
                    {selectedCard === card.accountNumber && (
                      <span className="text-purple-400 text-sm">✓ Selected</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Recent Transactions</h2>
            <div className="flex items-center gap-3">
              {selectedCard && (
                <span className="text-sm text-purple-400">
                  {cards.find(c => c.accountNumber === selectedCard)?.name || 'Selected Card'}
                </span>
              )}
              <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded">
                {transactions.filter(tx => {
                  if (selectedCard && selectedCard !== 'all') {
                    return tx.senderCardNumber === selectedCard || tx.recipientCardNumber === selectedCard;
                  }
                  return true;
                }).length} transactions
              </span>
              <button
                onClick={downloadPDF}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-all shadow-lg hover:shadow-xl"
                title="Download statement as PDF"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
          
          {loading ? (
            <p className="text-white/70 text-center py-8">Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p className="text-white/70 text-center py-8">No transactions found for this period</p>
          ) : (
            (() => {
              const filteredTx = transactions.filter(tx => {
                if (selectedCard && selectedCard !== 'all') {
                  return tx.senderCardNumber === selectedCard || tx.recipientCardNumber === selectedCard;
                }
                return true;
              });
              
              return filteredTx.length === 0 ? (
                <p className="text-white/70 text-center py-8">No transactions found for this card</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredTx.slice(0, 10).map((tx, idx) => {
                    const isIncoming = tx.recipientUserId === userId;
                    
                    return (
                      <div key={idx} className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            isIncoming ? 'bg-green-500/20' : 'bg-red-500/20'
                          }`}>
                            {isIncoming ? (
                              <ArrowDownLeft className="w-5 h-5 text-green-400" />
                            ) : (
                              <ArrowUpRight className="w-5 h-5 text-red-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              {isIncoming ? `From ${tx.senderName}` : `To ${tx.recipientName}`}
                            </p>
                            <p className="text-white/60 text-sm">
                              {new Date(tx.timestamp).toLocaleDateString()} {new Date(tx.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${
                            isIncoming ? 'text-green-400' : 'text-red-400'
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

        {/* Logout Button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg bg-red-600 hover:bg-red-700 px-4 py-3 text-sm font-medium text-white transition"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}


