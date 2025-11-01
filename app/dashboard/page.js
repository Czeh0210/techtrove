'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  TrendingDown,
  Wallet,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  MessageSquare,
  LogOut
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(0); // 0 = current month, 1 = last month, etc.
  const [typeFilter, setTypeFilter] = useState('all');
  
  // Statistics
  const [stats, setStats] = useState({
    totalCashIn: 0,
    totalCashOut: 0,
    totalTransactions: 0,
    netChange: 0
  });

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    const savedUserName = localStorage.getItem('userName');
    const savedPeriod = localStorage.getItem('dashboardPeriod');
    
    if (savedToken) {
      setToken(savedToken);
      setUser({ username: savedUserName || 'User' });
      
      // If there's a saved period from chatbot redirect, use it
      if (savedPeriod && ['day', 'week', 'month'].includes(savedPeriod)) {
        setPeriod(savedPeriod);
        // Clear it after using
        localStorage.removeItem('dashboardPeriod');
      }
    } else {
      // Redirect to chatbot for login
      router.push('/chatbot');
    }
  }, [router]);

  // Fetch transactions
  const fetchTransactions = async () => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      // When period is 'month', fetch last 6 months of data
      const fetchPeriod = period === 'month' ? 'year' : period;
      const res = await fetch(`/api/transactions?period=${fetchPeriod}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      console.log('📥 Fetched transactions for period:', fetchPeriod);
      console.log('Transactions received:', data.transactions?.length || 0);
      console.log('Balance:', data.balance);
      
      if (data.transactions) {
        setTransactions(data.transactions);
        setBalance(data.balance);
        calculateStats(data.transactions);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (txns) => {
    console.log('📊 Calculating stats for transactions:', txns.length);
    console.log('Transactions:', txns.map(t => ({ type: t.type, amount: t.amount, desc: t.description })));
    
    const cashInTxns = txns.filter(t => 
      t.type === 'cash-in' || 
      t.type === 'transfer-in' || 
      (t.type === 'transfer' && t.amount > 0)
    );
    const cashIn = cashInTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    console.log('💚 Cash In transactions:', cashInTxns.length, 'Total:', cashIn);
    
    const cashOutTxns = txns.filter(t => 
      t.type === 'cash-out' || 
      t.type === 'transaction' || 
      t.type === 'payment' || 
      t.type === 'transfer-out' ||
      (t.type === 'transfer' && t.amount < 0)
    );
    const cashOut = cashOutTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    console.log('🔴 Cash Out transactions:', cashOutTxns.length, 'Total:', cashOut);
    
    setStats({
      totalCashIn: cashIn,
      totalCashOut: cashOut,
      totalTransactions: txns.length,
      netChange: cashIn - cashOut
    });
  };

  // Filter transactions and recalculate stats based on filter
  useEffect(() => {
    let filtered = transactions;
    
    // Filter by specific month if period is 'month'
    if (period === 'month' && selectedMonth >= 0) {
      const now = new Date();
      const targetMonth = new Date(now.getFullYear(), now.getMonth() - selectedMonth, 1);
      const startOfMonth = targetMonth.getTime();
      const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59).getTime();
      
      filtered = filtered.filter(t => t.timestamp >= startOfMonth && t.timestamp <= endOfMonth);
    }
    
    // Filter by transaction type
    if (typeFilter === 'cash-in') {
      filtered = filtered.filter(t => 
        t.type === 'cash-in' || 
        t.type === 'transfer-in' || 
        (t.type === 'transfer' && t.amount > 0)
      );
    } else if (typeFilter === 'cash-out') {
      filtered = filtered.filter(t => 
        t.type === 'cash-out' || 
        t.type === 'transaction' || 
        t.type === 'payment' || 
        t.type === 'transfer-out' ||
        (t.type === 'transfer' && t.amount < 0)
      );
    }
    
    setFilteredTransactions(filtered);
    
    // Recalculate stats based on filtered transactions
    calculateStats(filtered);
  }, [transactions, typeFilter, period, selectedMonth]);

  // Fetch on mount and period change
  useEffect(() => {
    if (token) {
      fetchTransactions();
    }
  }, [token, period]);

  // Chart data preparation
  const getChartData = () => {
    const sortedTxns = [...filteredTransactions].sort((a, b) => a.timestamp - b.timestamp);
    return sortedTxns.map((txn, idx) => ({
      date: new Date(txn.timestamp).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' }),
      balance: txn.balanceAfter || balance,
      amount: txn.amount,
      type: txn.type
    }));
  };

  // Get month name for dropdown
  const getMonthName = (monthsAgo) => {
    const date = new Date();
    date.setMonth(date.getMonth() - monthsAgo);
    return date.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
  };

  // Get current viewing period text for display
  const getCurrentPeriodText = () => {
    if (period === 'day') return 'Today';
    if (period === 'week') return 'This Week';
    if (period === 'month') return getMonthName(selectedMonth);
    return '';
  };

  const formatCurrency = (amount) => {
    return `RM ${Math.abs(amount).toFixed(2)}`;
  };

  const getTypeColor = (type, amount) => {
    if (type === 'cash-in' || type === 'transfer-in' || (type === 'transfer' && amount > 0)) return 'text-green-600';
    if (type === 'cash-out' || type === 'transaction' || type === 'payment' || type === 'transfer-out' || (type === 'transfer' && amount < 0)) return 'text-red-600';
    return 'text-gray-600';
  };

  const getTypeBadge = (type, amount) => {
    if (type === 'cash-in' || type === 'transfer-in' || (type === 'transfer' && amount > 0)) {
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Cash In</Badge>;
    }
    if (type === 'cash-out' || type === 'transaction' || type === 'payment' || type === 'transfer-out') {
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Cash Out</Badge>;
    }
    if (type === 'transfer' && amount < 0) {
      return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Transfer Out</Badge>;
    }
    return <Badge variant="secondary">{type}</Badge>;
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
    router.push('/chatbot');
  };

  // Show loading while checking authentication
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md shadow-2xl">
          <CardContent className="pt-6">
            <div className="text-center">
              <RefreshCw className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
              <p className="text-lg font-medium">Checking authentication...</p>
              <p className="text-sm text-muted-foreground mt-2">Redirecting to login if needed</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const chartData = getChartData();
  const maxBalance = Math.max(...chartData.map(d => d.balance), balance);
  const minBalance = Math.min(...chartData.map(d => d.balance), 0);
  const balanceRange = maxBalance - minBalance || 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      {/* Chatbot Link */}
      <div className="fixed top-6 right-6 z-50 flex gap-2">
        <Link href="/chatbot">
          <Button className="gap-2 shadow-lg hover:shadow-xl transition-all">
            <MessageSquare className="h-4 w-4" />
            AI Chatbot
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
      
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Transaction Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back, {user?.username || 'User'}!</p>
          </div>
          <Button 
            onClick={fetchTransactions} 
            variant="outline" 
            className="gap-2"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-lg border-2 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Balance</p>
                  <p className="text-2xl font-bold text-primary">RM {balance.toFixed(2)}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-2 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Cash In</p>
                  <p className="text-2xl font-bold text-green-600">RM {stats.totalCashIn.toFixed(2)}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <ArrowDownLeft className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-2 border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Cash Out</p>
                  <p className="text-2xl font-bold text-red-600">RM {stats.totalCashOut.toFixed(2)}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <ArrowUpRight className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-2 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Net Change</p>
                  <p className={`text-2xl font-bold ${stats.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.netChange >= 0 ? '+' : ''}RM {stats.netChange.toFixed(2)}
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-full ${stats.netChange >= 0 ? 'bg-green-100' : 'bg-red-100'} flex items-center justify-center`}>
                  {stats.netChange >= 0 ? (
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Balance Chart - Circular Progress */}
        <Card className="shadow-xl border-2 border-primary/10">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Balance Overview
              </CardTitle>
              <div className="flex gap-2 items-center">
                <Button
                  variant={period === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setPeriod('day');
                    setSelectedMonth(0);
                  }}
                >
                  Day
                </Button>
                <Button
                  variant={period === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setPeriod('week');
                    setSelectedMonth(0);
                  }}
                >
                  Week
                </Button>
                <Button
                  variant={period === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriod('month')}
                >
                  Month
                </Button>
                
                {/* Month selector dropdown - only show when Month is selected */}
                {period === 'month' && (
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="ml-2 px-3 py-1.5 text-sm border border-input bg-background rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value={0}>{getMonthName(0)}</option>
                    <option value={1}>{getMonthName(1)}</option>
                    <option value={2}>{getMonthName(2)}</option>
                    <option value={3}>{getMonthName(3)}</option>
                    <option value={4}>{getMonthName(4)}</option>
                    <option value={5}>{getMonthName(5)}</option>
                  </select>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8">
              {/* Debug Info - Remove after testing */}
              <div className="text-xs text-muted-foreground mb-4 text-center">
                Cash In: RM {stats.totalCashIn.toFixed(2)} | Cash Out: RM {stats.totalCashOut.toFixed(2)} | Total: RM {(stats.totalCashIn + stats.totalCashOut).toFixed(2)}
              </div>

              {/* Main Balance Circle */}
              <div className="relative w-80 h-80">
                {/* Background Circle */}
                <svg className="w-full h-full transform -rotate-90">
                  {/* Background ring */}
                  <circle
                    cx="160"
                    cy="160"
                    r="140"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="24"
                  />
                  
                  {stats.totalCashIn + stats.totalCashOut > 0 ? (
                    <>
                      {/* Cash In (Green) - Starting from 0 */}
                      {stats.totalCashIn > 0 && (
                        <circle
                          cx="160"
                          cy="160"
                          r="140"
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth="24"
                          strokeDasharray={`${(stats.totalCashIn / (stats.totalCashIn + stats.totalCashOut)) * 880} 880`}
                          strokeDashoffset="0"
                          className="transition-all duration-1000 ease-out"
                          strokeLinecap="round"
                        />
                      )}
                      
                      {/* Cash Out (Red) - Following Cash In */}
                      {stats.totalCashOut > 0 && (
                        <circle
                          cx="160"
                          cy="160"
                          r="140"
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="24"
                          strokeDasharray={`${(stats.totalCashOut / (stats.totalCashIn + stats.totalCashOut)) * 880} 880`}
                          strokeDashoffset={`-${(stats.totalCashIn / (stats.totalCashIn + stats.totalCashOut)) * 880}`}
                          className="transition-all duration-1000 ease-out"
                          strokeLinecap="round"
                        />
                      )}
                    </>
                  ) : (
                    <>
                      {/* No cash flow - Yellow circle */}
                      <circle
                        cx="160"
                        cy="160"
                        r="140"
                        fill="none"
                        stroke="#eab308"
                        strokeWidth="24"
                        strokeDasharray="880 880"
                        strokeDashoffset="0"
                        className="transition-all duration-1000 ease-out"
                      />
                    </>
                  )}
                </svg>
                
                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-sm text-muted-foreground mb-2">Total Balance</p>
                  <p className="text-4xl font-bold text-primary">RM {balance.toFixed(2)}</p>
                  {stats.totalCashIn + stats.totalCashOut > 0 ? (
                    <>
                      <p className={`text-lg font-semibold mt-2 ${stats.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stats.netChange >= 0 ? '+' : ''}RM {stats.netChange.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">Net Change</p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-semibold mt-2 text-yellow-600">
                        RM 0.00
                      </p>
                      <p className="text-xs text-yellow-600">No Cash Flow</p>
                    </>
                  )}
                </div>
              </div>

              {/* Legend */}
              <div className="flex gap-8 mt-8">
                {stats.totalCashIn + stats.totalCashOut > 0 ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-500"></div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Cash In</p>
                        <p className="text-lg font-bold text-green-600">RM {stats.totalCashIn.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-red-500"></div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Cash Out</p>
                        <p className="text-lg font-bold text-red-600">RM {stats.totalCashOut.toFixed(2)}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-yellow-500"></div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">No Activity</p>
                      <p className="text-lg font-bold text-yellow-600">RM 0.00</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card className="shadow-xl border-2 border-primary/10">
          <CardHeader>
            <div className="flex justify-between items-center flex-wrap gap-4">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <div className="flex flex-col">
                  <span>Transaction History ({filteredTransactions.length})</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Viewing: {getCurrentPeriodText()}
                  </span>
                </div>
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={typeFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={typeFilter === 'cash-in' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter('cash-in')}
                  className="gap-2"
                >
                  <ArrowDownLeft className="h-4 w-4" />
                  Cash In
                </Button>
                <Button
                  variant={typeFilter === 'cash-out' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter('cash-out')}
                  className="gap-2"
                >
                  <ArrowUpRight className="h-4 w-4" />
                  Cash Out
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((txn, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-4 rounded-lg border-2 hover:border-primary/30 transition-all hover:shadow-md bg-gradient-to-r from-background to-muted/20"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                        txn.amount >= 0 ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {txn.amount >= 0 ? (
                          <ArrowDownLeft className="h-6 w-6 text-green-600" />
                        ) : (
                          <ArrowUpRight className="h-6 w-6 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{txn.description}</p>
                          {getTypeBadge(txn.type, txn.amount)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(txn.timestamp).toLocaleDateString('en-MY', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${getTypeColor(txn.type, txn.amount)}`}>
                        {txn.amount >= 0 ? '+' : '-'}{formatCurrency(txn.amount)}
                      </p>
                      {txn.balanceAfter !== undefined && (
                        <p className="text-sm text-muted-foreground">
                          Balance: RM {txn.balanceAfter.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No transactions found for the selected filter
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
