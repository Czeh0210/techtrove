"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import ScrollStack, { ScrollStackItem } from "@/components/ui/scroll-stack";

export default function CardPage() {
  const router = useRouter();
  const [cardName, setCardName] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [cards, setCards] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Malaysian Banks
  const malaysianBanks = [
    "Maybank",
    "CIMB Bank",
    "Public Bank",
    "RHB Bank",
    "Hong Leong Bank",
    "AmBank",
    "Bank Islam",
    "Bank Rakyat",
    "UOB Malaysia",
    "OCBC Bank",
    "HSBC Bank Malaysia",
    "Standard Chartered Malaysia",
    "Affin Bank",
    "Alliance Bank",
    "Bank Muamalat"
  ];

  // Check session on mount and load existing cards
  useEffect(() => {
    const storedSessionId = localStorage.getItem("sessionId");
    const storedUserName = localStorage.getItem("userName");
    const storedUserEmail = localStorage.getItem("userEmail");
    const storedUserId = localStorage.getItem("userId");

    if (storedSessionId && storedUserName && storedUserId) {
      setSessionId(storedSessionId);
      setUserInfo({
        name: storedUserName,
        email: storedUserEmail,
        id: storedUserId,
      });
      console.log("Active session detected for user:", storedUserName);
      
      // Load existing cards from MongoDB
      loadUserCards(storedUserId);
    } else {
      // No session, redirect to login
      router.push("/auth");
    }
  }, [router]);

  // Load user's cards from MongoDB
  const loadUserCards = async (userId) => {
    try {
      const res = await fetch(`/api/cards/list?userId=${userId}`);
      const data = await res.json();
      
      if (res.ok && data.cards) {
        setCards(data.cards);
      }
    } catch (error) {
      console.error("Error loading cards:", error);
    }
  };

  // Generate random account number (16 digits)
  const generateAccountNumber = () => {
    let accNumber = "";
    for (let i = 0; i < 16; i++) {
      accNumber += Math.floor(Math.random() * 10);
    }
    return accNumber;
  };

  // Format account number with spaces (XXXX XXXX XXXX XXXX)
  const formatAccountNumber = (number) => {
    return number.match(/.{1,4}/g).join(" ");
  };

  // Handle card creation
  const handleCreateCard = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    setError("");
    
    if (cardName.trim() === "") {
      setError("Please enter a name for the card");
      return;
    }

    if (!selectedBank) {
      setError("Please select a bank");
      return;
    }

    if (!userInfo || !sessionId) {
      setError("Session expired. Please login again.");
      return;
    }

    // Check if the same name exists for the same bank
    const duplicateCard = cards.find(
      card => card.name.toLowerCase() === cardName.trim().toLowerCase() && 
              card.bank === selectedBank
    );

    if (duplicateCard) {
      setError(`A card with the name "${cardName}" already exists for ${selectedBank}. Please use a different name or select a different bank.`);
      return;
    }

    const newCard = {
      name: cardName.trim(),
      bank: selectedBank,
      accountNumber: generateAccountNumber(),
      createdDate: new Date().toLocaleDateString(),
      cvv: Math.floor(100 + Math.random() * 900), // Random 3-digit CVV
      expiryDate: `${Math.floor(Math.random() * 12) + 1}/${new Date().getFullYear() + 3}`,
      userId: userInfo.id,
      sessionId: sessionId,
    };

    try {
      setLoading(true);
      
      // Store card in MongoDB
      const res = await fetch("/api/cards/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCard),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Failed to create card");
        return;
      }

      // Add the new card to the local state
      setCards([...cards, data.card]);
      setCardName(""); // Clear input after successful registration
      setSelectedBank(""); // Clear bank selection
      setShowForm(false); // Hide form after submission
      
      console.log("Card created successfully:", data.cardId);
    } catch (err) {
      setError("Network error. Please try again.");
      console.error("Card creation error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 pb-32 sm:pt-32 sm:pb-8">
      <Navigation />
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          Create Your Card
        </h1>

        {/* Initial Create Account Button */}
        {!showForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-200"
            >
              Create Account
            </button>
          </div>
        )}

        {/* Card Creation Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            {/* Back Arrow */}
            <button
              onClick={() => {
                setShowForm(false);
                setCardName("");
                setSelectedBank("");
                setError("");
              }}
              className="flex items-center text-gray-600 hover:text-gray-800 mb-4 transition duration-200"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 mr-2" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path 
                  fillRule="evenodd" 
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" 
                  clipRule="evenodd" 
                />
              </svg>
              Back
            </button>

            <form onSubmit={handleCreateCard}>
              <div className="mb-4">
                <label
                  htmlFor="bankSelect"
                  className="block text-gray-700 font-semibold mb-2"
                >
                  Select Bank
                </label>
                <select
                  id="bankSelect"
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value="">Choose a bank...</option>
                  {malaysianBanks.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label
                  htmlFor="cardName"
                  className="block text-gray-700 font-semibold mb-2"
                >
                  Cardholder Name
                </label>
                <input
                  type="text"
                  id="cardName"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
              
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {error}
                </div>
              )}
              
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? "Creating..." : "Submit"}
              </button>
            </form>
          </div>
        )}

        {/* Display Cards in Scrollable View */}
        {cards.length > 0 && (
          <div className="w-full">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Your Cards ({cards.length})</h2>
            <ScrollStack className="w-full">
              {cards.map((card, index) => (
                <ScrollStackItem key={index} className="w-full">
                  <div className="relative group h-full">
                    {/* Animated gradient border */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 rounded-2xl opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-gradient"></div>
                    
                    {/* Card content */}
                    <div className="relative bg-black rounded-2xl p-8 text-white h-full">
                      {/* Bank Name at Top */}
                      <div className="mb-4">
                        <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-orange-400">
                          {card.bank}
                        </div>
                      </div>

                      <div className="mb-6">
                        <div className="text-sm opacity-60 mb-2">Card Number</div>
                        <div className="text-2xl font-mono tracking-wider">
                          {formatAccountNumber(card.accountNumber)}
                        </div>
                      </div>

                      <div className="flex justify-between items-end mb-6">
                        <div>
                          <div className="text-sm opacity-60 mb-1">Cardholder Name</div>
                          <div className="text-xl font-semibold uppercase">
                            {card.name}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm opacity-60 mb-1">Valid Thru</div>
                          <div className="text-lg font-mono">{card.expiryDate}</div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-white/10 flex justify-between">
                        <div>
                          <div className="text-sm opacity-60 mb-1">CVV</div>
                          <div className="text-lg font-mono">{card.cvv}</div>
                        </div>
                        <div>
                          <div className="text-sm opacity-60 mb-1">Created</div>
                          <div className="text-sm opacity-80">{card.createdDate}</div>
                        </div>
                      </div>
                      
                      {/* Wave decoration in corner */}
                      <div className="absolute bottom-6 right-6 opacity-40">
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8 20C8 20 12 12 20 12C28 12 32 20 32 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          <path d="M8 28C8 28 12 20 20 20C28 20 32 28 32 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </ScrollStackItem>
              ))}
            </ScrollStack>
            <p className="text-sm text-gray-600 mt-4 text-center">
              Scroll up or down to view all cards ↕
            </p>
          </div>
        )}
      </div>
    </div>
  );
}