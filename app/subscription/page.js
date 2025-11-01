"use client";

import Navigation from "@/components/Navigation";
import { Pricing } from "@/components/pricing";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    const storedUserName = localStorage.getItem("userName");
    const storedUserEmail = localStorage.getItem("userEmail");

    if (storedUserId && storedUserName) {
      setUserInfo({
        id: storedUserId,
        name: storedUserName,
        email: storedUserEmail,
      });
    }

    // Check for success or canceled payment
    if (searchParams.get("success")) {
      setNotification({ type: "success", message: "Subscription successful! Welcome to your new plan." });
      // Clear the query params after 3 seconds
      setTimeout(() => {
        router.replace("/subscription");
      }, 3000);
    }
    if (searchParams.get("canceled")) {
      setNotification({ type: "error", message: "Payment was canceled. You can try again anytime." });
      setTimeout(() => {
        router.replace("/subscription");
      }, 3000);
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleSubscribe = async (priceId) => {
    if (!userInfo) {
      setNotification({ type: "error", message: "Please login first to subscribe" });
      setTimeout(() => router.push("/auth"), 2000);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          userId: userInfo.id,
          userEmail: userInfo.email,
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        setNotification({ type: "error", message: data.error || "Failed to create checkout session" });
        setLoading(false);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setNotification({ type: "error", message: "Something went wrong. Please try again." });
      setLoading(false);
    }
  };

  const pricingPlans = [
    {
      name: "Free",
      price: 0,
      yearlyPrice: 0,
      period: "forever",
      description: "Perfect for getting started",
      features: [
        "1 Card Creation",
        "Basic Support",
        "Community Access",
        "Mobile App Access",
      ],
      buttonText: "Get Started",
      href: "javascript:void(0)",
      isPopular: false,
      priceId: "price_1SOZkuPMKOwL3SJTKcb9f1jR",
      onClick: () => setNotification({ type: "success", message: "Free plan is already active!" }),
    },
    {
      name: "Pro",
      price: 18,
      yearlyPrice: 172.8,
      period: "month",
      description: "For professionals who need more",
      features: [
        "Unlimited Cards",
        "Priority Support",
        "Advanced Analytics",
        "API Access",
        "Custom Branding",
        "Team Collaboration",
      ],
      buttonText: "Upgrade to Pro",
      href: "javascript:void(0)",
      isPopular: true,
      priceId: "price_1SOZiCPMKOwL3SJTmI7p9Xrk",
      onClick: () => handleSubscribe("price_1SOZiCPMKOwL3SJTmI7p9Xrk"),
    },
    {
      name: "Pro Max",
      price: 38,
      yearlyPrice: 364.8,
      period: "month",
      description: "Maximum power for enterprises",
      features: [
        "Everything in Pro",
        "Dedicated Support",
        "Custom Integrations",
        "Advanced Security",
        "White Label Solution",
        "SLA Guarantee",
        "Training Sessions",
        "Custom Development",
      ],
      buttonText: "Go Pro Max",
      href: "javascript:void(0)",
      isPopular: false,
      priceId: "price_1SOZicPMKOwL3SJTmTZsu7i0",
      onClick: () => handleSubscribe("price_1SOZicPMKOwL3SJTmTZsu7i0"),
    },
  ];

  // Wrap plans with onClick handlers
  const plansWithHandlers = pricingPlans.map(plan => ({
    ...plan,
    href: "#",
  }));

  // Add click event listener
  useEffect(() => {
    const handlePlanClick = (e) => {
      const button = e.target.closest('a[href="#"]');
      if (button) {
        e.preventDefault();
        const planIndex = parseInt(button.getAttribute('data-plan-index'));
        if (!isNaN(planIndex) && pricingPlans[planIndex]) {
          pricingPlans[planIndex].onClick();
        }
      }
    };

    document.addEventListener('click', handlePlanClick);
    return () => document.removeEventListener('click', handlePlanClick);
  }, [userInfo]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:bg-black px-4 pb-32 sm:pt-32 sm:pb-8">
      <Navigation />
      
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-5">
          <div className={`rounded-lg border px-4 py-3 shadow-lg ${
            notification.type === "success" 
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-900/30 dark:text-emerald-100"
              : "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-100"
          }`}>
            <div className="flex items-start gap-3">
              {notification.type === "success" ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="size-5 mt-0.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12m13.36-2.29a.75.75 0 1 0-1.22-.92l-3.18 4.22-1.56-1.56a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.13-.09z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="size-5 mt-0.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <div className="text-sm font-medium max-w-xs">{notification.message}</div>
              <button
                onClick={() => setNotification(null)}
                className="ml-auto -mr-1 -mt-1 rounded p-1 hover:bg-black/10 dark:hover:bg-white/10"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-4"
                >
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div onClick={(e) => {
        const button = e.target.closest('a');
        if (button && button.textContent) {
          e.preventDefault();
          const plan = pricingPlans.find(p => button.textContent.includes(p.buttonText));
          if (plan && plan.onClick) {
            plan.onClick();
          }
        }
      }}>
        <Pricing 
          plans={plansWithHandlers} 
          title="Choose Your Plan"
          description="Select the perfect plan for your needs
All plans include access to our platform and dedicated support."
        />
      </div>
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6">
            <p className="text-lg font-semibold">Redirecting to checkout...</p>
          </div>
        </div>
      )}
    </div>
  );
}
