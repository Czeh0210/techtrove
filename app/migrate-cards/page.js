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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
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
