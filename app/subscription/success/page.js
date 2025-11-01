'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { NavBar } from '@/components/ui/tubelight-navbar';
import { Home, MessageSquare, LayoutDashboard, CreditCard, CheckCircle } from 'lucide-react';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  // Navigation items for Tubelight Navbar
  const navItems = [
    {
      name: "Home",
      url: "/home",
      icon: Home
    },
    {
      name: "Chatbot",
      url: "/chatbot",
      icon: MessageSquare
    },
    {
      name: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard
    },
    {
      name: "Subscription",
      url: "/subscription",
      icon: CreditCard
    }
  ];

  useEffect(() => {
    if (sessionId) {
      // Optional: Fetch session details from Stripe
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Tubelight Navigation Bar */}
      <NavBar items={navItems} />

      {/* Main Content */}
      <main className="relative z-50 pt-28 sm:pt-32">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl p-12 text-center">
            {loading ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-gray-600">Processing your payment...</p>
              </div>
            ) : (
              <>
                {/* Success Icon */}
                <div className="flex justify-center mb-6">
                  <div className="bg-green-100 rounded-full p-6">
                    <CheckCircle className="h-20 w-20 text-green-600" />
                  </div>
                </div>

                {/* Success Message */}
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Payment Successful! 🎉
                </h1>
                <p className="text-xl text-gray-600 mb-8">
                  Thank you for subscribing! Your payment has been processed successfully.
                </p>

                {/* Details */}
                <div className="bg-gray-50 rounded-lg p-6 mb-8">
                  <p className="text-sm text-gray-500 mb-2">Session ID</p>
                  <p className="text-xs font-mono text-gray-700 break-all">
                    {sessionId || 'N/A'}
                  </p>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    What's Next?
                  </h3>
                  <ul className="text-left text-blue-800 space-y-2">
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>You'll receive a confirmation email shortly</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Your subscription is now active</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Access all premium features immediately</span>
                    </li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/home"
                    className="inline-flex items-center justify-center px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
                  >
                    Go to Home
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center px-8 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    View Dashboard
                  </Link>
                </div>

                {/* Support */}
                <p className="text-sm text-gray-500 mt-8">
                  Need help? Contact our support team at{' '}
                  <a href="mailto:support@techtrove.com" className="text-indigo-600 hover:underline">
                    support@techtrove.com
                  </a>
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}