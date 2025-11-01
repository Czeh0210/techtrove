'use client';

import { useState } from 'react';
import Navigation from '@/components/Navigation';

export default function MigrateCards() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cards/migrate');
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      setStatus({ error: error.message });
    }
    setLoading(false);
  };

  const runMigration = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cards/migrate', {
        method: 'POST'
      });
      const data = await res.json();
      setStatus(data);
      
      // Refresh status after migration
      if (data.ok) {
        setTimeout(checkStatus, 1000);
      }
    } catch (error) {
      setStatus({ error: error.message });
    }
    setLoading(false);
  };

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
      
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
          <h1 className="text-3xl font-bold text-white mb-6">
            Card Balance Migration
          </h1>
          
          <p className="text-white/80 mb-6">
            This tool will add balance field (RM1000) to all existing cards in your database.
          </p>

          <div className="space-y-4 mb-6">
            <button
              onClick={checkStatus}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Check Migration Status'}
            </button>

            <button
              onClick={runMigration}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Running...' : 'Run Migration (Add Balance to Cards)'}
            </button>
          </div>

          {status && (
            <div className="bg-slate-900/50 rounded-lg p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">Results:</h2>
              <pre className="text-green-300 text-sm overflow-auto">
                {JSON.stringify(status, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-8 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-200 text-sm">
              <strong>Note:</strong> After running the migration, refresh MongoDB Compass to see the updated cards with balance field.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
