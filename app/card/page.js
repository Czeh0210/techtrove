"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import * as faceapi from "face-api.js";
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';

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
  const [selectedCard, setSelectedCard] = useState(null);
  const [showCardOptions, setShowCardOptions] = useState(false);
  const [showFaceVerification, setShowFaceVerification] = useState(false);
  const [verifiedCardDetails, setVerifiedCardDetails] = useState(null);
  const [videoStream, setVideoStream] = useState(null);
  const [faceVerifying, setFaceVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null); // 'success', 'error', or null
  const [verificationMessage, setVerificationMessage] = useState(""); // Error message to display
  const [currentCardIndex, setCurrentCardIndex] = useState(0); // Current card in carousel
  const [dragDirection, setDragDirection] = useState(null);

  // Card stack animation values
  const dragY = useMotionValue(0);
  const rotateX = useTransform(dragY, [-200, 0, 200], [15, 0, -15]);

  // Configuration
  const offset = 10;
  const scaleStep = 0.04;
  const dimStep = 0.1;
  const borderRadius = 12;
  const swipeThreshold = 50;

  const spring = {
    type: "spring",
    stiffness: 170,
    damping: 26
  };

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
      balance: 1000, // Default RM 1000
      currency: "MYR", // Malaysian Ringgit
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

  // Handle card click to show options
  const handleCardClick = (card) => {
    setSelectedCard(card);
    setShowCardOptions(true);
  };

  // Handle delete card
  const handleDeleteCard = async () => {
    if (!selectedCard) return;
    
    try {
      const res = await fetch(`/api/cards/delete?cardId=${selectedCard._id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setCards(cards.filter(c => c._id !== selectedCard._id));
        setShowCardOptions(false);
        setSelectedCard(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete card");
      }
    } catch (error) {
      console.error("Error deleting card:", error);
      alert("Failed to delete card");
    }
  };

  // Initialize face-api models
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/models";
      try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        console.log("Face detection models loaded");
      } catch (err) {
        console.error("Error loading face-api models:", err);
      }
    };
    loadModels();
  }, []);

  // Handle face verification
  const handleFaceVerification = async () => {
    setShowCardOptions(false);
    setShowFaceVerification(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setVideoStream(stream);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Failed to access camera");
      setShowFaceVerification(false);
    }
  };

  // Capture and verify face
  const captureFaceAndVerify = async () => {
    if (!videoRef.current || faceVerifying) return;
    
    setFaceVerifying(true);
    console.log("Starting face verification...");
    
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        console.log("No face detected");
        setVerificationStatus('error');
        setVerificationMessage("No face detected. Please try again.");
        
        setTimeout(() => {
          setVerificationStatus(null);
          setVerificationMessage("");
          setFaceVerifying(false);
        }, 3000);
        return;
      }

      console.log("Face detected, extracting embedding...");
      const embedding = Array.from(detection.descriptor);
      console.log("Embedding length:", embedding.length);

      // Verify face with login API
      console.log("Sending verification request to API...");
      console.log("Email:", userInfo.email);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userInfo.email,
          embedding,
          method: "face"
        }),
      });

      console.log("Response status:", res.status);
      console.log("Response ok:", res.ok);
      
      let data;
      try {
        data = await res.json();
        console.log("API response:", data);
      } catch (e) {
        console.error("Failed to parse JSON response:", e);
        alert("Server error: Invalid response format");
        setFaceVerifying(false);
        return;
      }

      if (res.ok && data.ok) {
        console.log("Face verified successfully!");
        console.log("Similarity:", data.similarity);
        console.log("Distance:", data.distance);
        
        // Show success animation
        setVerificationStatus('success');
        
        // Wait for animation then show card details
        setTimeout(() => {
          setVerifiedCardDetails({
            ...selectedCard,
            amount: selectedCard.balance || 1000 // Use actual balance from card
          });
          
          // Stop camera
          if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            setVideoStream(null);
          }
          setShowFaceVerification(false);
          setFaceVerifying(false);
          setVerificationStatus(null);
        }, 1500);
      } else {
        console.log("Face verification failed:", data);
        console.log("Status:", res.status);
        
        // Show error animation (shake)
        setVerificationStatus('error');
        setVerificationMessage("Face verification failed. Please try again.");
        
        setTimeout(() => {
          setVerificationStatus(null);
          setVerificationMessage("");
          setFaceVerifying(false);
        }, 3000);
        
        // Log detailed error info to console only
        const errorMsg = data.error || data.message || 'Unknown error';
        if (data.similarity !== undefined) {
          console.log("Your similarity score:", data.similarity, "Required:", data.cosTh);
          console.log("Your distance:", data.distance, "Required:", data.distTh);
        }
      }
    } catch (err) {
      console.log("Face verification error:", err);
      setVerificationStatus('error');
      setVerificationMessage("Verification failed. Please try again.");
      
      setTimeout(() => {
        setVerificationStatus(null);
        setVerificationMessage("");
        setFaceVerifying(false);
      }, 3000);
    }
  };

  // Close face verification
  const closeFaceVerification = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    setShowFaceVerification(false);
    setSelectedCard(null);
  };

  // Close card details
  const closeCardDetails = () => {
    setVerifiedCardDetails(null);
    setSelectedCard(null);
  };

  // Card stack navigation functions
  const moveToEnd = () => {
    setCards(prev => [...prev.slice(1), prev[0]]);
    setCurrentCardIndex((prev) => (prev + 1) % cards.length);
  };

  const moveToStart = () => {
    setCards(prev => [prev[prev.length - 1], ...prev.slice(0, -1)]);
    setCurrentCardIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleDragEnd = (_, info) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    if (Math.abs(offset) > swipeThreshold || Math.abs(velocity) > 500) {
      if (offset < 0 || velocity < 0) {
        setDragDirection('up');
        setTimeout(() => {
          moveToEnd();
          setDragDirection(null);
        }, 150);
      } else {
        setDragDirection('down');
        setTimeout(() => {
          moveToStart();
          setDragDirection(null);
        }, 150);
      }
    }
    dragY.set(0);
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden p-8 pb-32 sm:pt-32 sm:pb-8">
      {/* Animated Aurora Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50"></div>
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-purple-400/30 to-pink-400/30 rounded-full blur-3xl animate-aurora-1"></div>
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-400/30 to-cyan-400/30 rounded-full blur-3xl animate-aurora-2"></div>
        <div className="absolute bottom-0 left-1/3 w-[550px] h-[550px] bg-gradient-to-br from-indigo-400/30 to-purple-400/30 rounded-full blur-3xl animate-aurora-3"></div>
        <div className="absolute top-1/2 right-1/4 w-[450px] h-[450px] bg-gradient-to-br from-pink-400/30 to-rose-400/30 rounded-full blur-3xl animate-aurora-4"></div>
      </div>

      <Navigation />
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex items-start justify-between mb-12">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 mb-2">
              My Cards
            </h1>
            <p className="text-gray-600 text-lg">
              Manage your bank accounts and cards
            </p>
          </div>
          
          {/* Create Account Button */}
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
              title="Create New Card"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create Account
            </button>
          )}
        </div>

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

        {/* Display Cards in Card Stack View */}
        {cards.length > 0 && !showForm && (
          <div className="w-full flex flex-col items-center mt-8">
            
            {/* Card Stack Container */}
            <div className="relative w-[500px] h-80 overflow-visible">
              <ul className="relative w-full h-full m-0 p-0">
                <AnimatePresence>
                  {cards.map((card, i) => {
                    const isFront = i === 0;
                    const brightness = Math.max(0.7, 1 - i * dimStep);
                    const baseZ = cards.length - i;

                    return (
                      <motion.li
                        key={card._id}
                        className="absolute w-full h-full list-none overflow-hidden rounded-lg"
                        style={{
                          cursor: isFront ? 'grab' : 'auto',
                          touchAction: 'none',
                          boxShadow: isFront
                            ? '0 25px 50px rgba(0, 0, 0, 0.3)'
                            : '0 15px 30px rgba(0, 0, 0, 0.15)',
                          rotateX: isFront ? rotateX : 0,
                          transformPerspective: 1000
                        }}
                        animate={{
                          top: `${i * -offset}%`,
                          scale: 1 - i * scaleStep,
                          filter: `brightness(${brightness})`,
                          zIndex: baseZ,
                          opacity: dragDirection && isFront ? 0 : 1
                        }}
                        exit={{
                          opacity: 0,
                          scale: 0.8,
                          transition: { duration: 0.2 }
                        }}
                        transition={spring}
                        drag={isFront ? 'y' : false}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.7}
                        onDrag={(_, info) => {
                          if (isFront) {
                            dragY.set(info.offset.y);
                          }
                        }}
                        onDragEnd={handleDragEnd}
                        whileDrag={
                          isFront
                            ? {
                                zIndex: cards.length + 1,
                                cursor: 'grabbing',
                                scale: 1.05,
                              }
                            : {}
                        }
                      >
                        <div className="relative group h-full">
                          {/* Animated gradient border */}
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 rounded-lg opacity-90"></div>
                          
                          {/* Card content */}
                          <div className="relative bg-black rounded-lg p-8 text-white h-full flex flex-col justify-between shadow-2xl">
                            {/* Three Dot Menu Button - Only on front card */}
                            {isFront && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCardClick(card);
                                }}
                                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition duration-200 z-10"
                                title="Options"
                              >
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  className="h-6 w-6" 
                                  fill="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <circle cx="12" cy="5" r="2"/>
                                  <circle cx="12" cy="12" r="2"/>
                                  <circle cx="12" cy="19" r="2"/>
                                </svg>
                              </button>
                            )}

                            {/* Bank Name at Top */}
                            {card.bank && (
                              <div className="mb-4">
                                <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-orange-400">
                                  {card.bank}
                                </div>
                              </div>
                            )}

                            <div className="mb-6">
                              <div className="text-sm opacity-60 mb-2">Card Number</div>
                              <div className="flex items-end justify-between">
                                <div className="text-2xl font-mono tracking-wider">
                                  {formatAccountNumber(card.accountNumber)}
                                </div>
                                {/* Visa Logo */}
                                <svg className="h-10 w-16 mb-0.5" viewBox="0 0 60 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <text x="0" y="24" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="bold" fill="#FFD700" fontStyle="italic">
                                    VISA
                                  </text>
                                </svg>
                              </div>
                            </div>

                            <div className="flex justify-between items-end">
                              <div>
                                <div className="text-sm opacity-60 mb-1">Cardholder Name</div>
                                <div className="text-xl font-semibold uppercase">
                                  {card.name}
                                </div>
                              </div>

                              <div className="text-center">
                                <div className="text-sm opacity-60 mb-1">CVV</div>
                                <div className="text-lg font-mono">{card.cvv}</div>
                              </div>

                              <div className="text-right">
                                <div className="text-sm opacity-60 mb-1">Valid Thru</div>
                                <div className="text-lg font-mono">{card.expiryDate}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </div>
          </div>
        )}

        {/* Card Options Modal */}
        {showCardOptions && selectedCard && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-bold mb-6 text-gray-800">Card Options</h3>
              <div className="space-y-4">
                <button
                  onClick={handleFaceVerification}
                  className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Details
                </button>
                <button
                  onClick={handleDeleteCard}
                  className="w-full bg-red-600 text-white py-4 rounded-lg font-semibold hover:bg-red-700 transition duration-200 flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Card
                </button>
                <button
                  onClick={() => {
                    setShowCardOptions(false);
                    setSelectedCard(null);
                  }}
                  className="w-full bg-gray-300 text-gray-700 py-4 rounded-lg font-semibold hover:bg-gray-400 transition duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Face Verification Modal */}
        {showFaceVerification && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl">
              <h3 className="text-2xl font-bold mb-6 text-gray-800 text-center">Face Verification</h3>
              
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full rounded-lg"
                  onLoadedMetadata={() => console.log("Video loaded")}
                />
                <canvas ref={canvasRef} className="absolute top-0 left-0" />
                
                {/* Face ID Icon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginTop: '-315px' }}>
                  <div className={`transition-all duration-500 ${
                    verificationStatus === 'success' 
                      ? 'scale-110 opacity-100' 
                      : verificationStatus === 'error'
                      ? 'animate-shake opacity-100'
                      : faceVerifying
                      ? 'opacity-100'
                      : 'opacity-60'
                  }`}>
                    {verificationStatus === 'success' ? (
                      // Success Checkmark
                      <div className="bg-green-500 rounded-full p-6 shadow-2xl animate-bounce-once">
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-16 w-16 text-white" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : verificationStatus === 'error' ? (
                      // Error X
                      <div className="bg-red-500 rounded-full p-6 shadow-2xl">
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-16 w-16 text-white" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    ) : (
                      // Face ID Icon with Pulsing Blue Ring
                      <div className="relative">
                        {/* Pulsing Blue Rings (when verifying) */}
                        {faceVerifying && (
                          <>
                            <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping"></div>
                            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-pulse"></div>
                          </>
                        )}
                        
                        {/* Face ID Icon */}
                        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-4 shadow-xl relative">
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className={`h-20 w-20 transition-colors duration-300 ${
                              faceVerifying ? 'text-blue-500' : 'text-blue-600'
                            }`}
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                          {/* Face ID corners */}
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8V6a3 3 0 013-3h2M3 16v2a3 3 0 003 3h2M21 8V6a3 3 0 00-3-3h-2M21 16v2a3 3 0 01-3 3h-2" />
                          {/* Face dots and smile */}
                          <circle cx="9" cy="10" r="0.5" fill="currentColor" strokeWidth={2} />
                          <circle cx="15" cy="10" r="0.5" fill="currentColor" strokeWidth={2} />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 14s1.5 2 3 2 3-2 3-2" />
                          <line x1="12" y1="10" x2="12" y2="13" strokeLinecap="round" />
                        </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Error Message Display */}
              {verificationMessage && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm font-medium">{verificationMessage}</p>
                  </div>
                </div>
              )}
              
              <div className="mt-6 space-y-4">
                <button
                  onClick={captureFaceAndVerify}
                  disabled={faceVerifying || verificationStatus !== null}
                  className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {faceVerifying ? "Verifying..." : verificationStatus === 'success' ? "Success!" : verificationStatus === 'error' ? "Failed" : "Scan Face"}
                </button>
                <button
                  onClick={closeFaceVerification}
                  className="w-full bg-gray-300 text-gray-700 py-4 rounded-lg font-semibold hover:bg-gray-400 transition duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Card Details Modal (After Verification) */}
        {verifiedCardDetails && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-bold mb-6 text-gray-800">Card Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600">Bank</label>
                  <p className="text-lg font-semibold">{verifiedCardDetails.bank}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Cardholder Name</label>
                  <p className="text-lg font-semibold">{verifiedCardDetails.name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Card Number</label>
                  <p className="text-lg font-mono">{formatAccountNumber(verifiedCardDetails.accountNumber)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">CVV</label>
                  <p className="text-lg font-mono">{verifiedCardDetails.cvv}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Expiry Date</label>
                  <p className="text-lg font-mono">{verifiedCardDetails.expiryDate}</p>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <label className="text-sm text-gray-600">Available Balance</label>
                  <p className="text-3xl font-bold text-green-600">RM {verifiedCardDetails.amount.toLocaleString()}</p>
                </div>
              </div>
              <button
                onClick={closeCardDetails}
                className="w-full mt-6 bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition duration-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}