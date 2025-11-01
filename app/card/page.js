"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import * as faceapi from "face-api.js";
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ArrowLeft, CreditCard, Eye, Trash2, X, CheckCircle2, AlertCircle, Scan } from "lucide-react";

export default function CardPage() {
  const router = useRouter();
  const [cardName, setCardName] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [cards, setCards] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cardsLoading, setCardsLoading] = useState(true);
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
  const [modelsLoaded, setModelsLoaded] = useState(false); // Track if face-api models are loaded
  const [actionDialog, setActionDialog] = useState({ open: false, status: 'loading', message: '', title: '' }); // loading, success, error

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
      setCardsLoading(true);
      const res = await fetch(`/api/cards/list?userId=${userId}`);
      const data = await res.json();
      
      if (res.ok && data.cards) {
        setCards(data.cards);
      }
    } catch (error) {
      console.error("Error loading cards:", error);
    } finally {
      setCardsLoading(false);
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
      
      // Show loading dialog
      setActionDialog({
        open: true,
        status: 'loading',
        title: 'Creating Card',
        message: 'Please wait while we create your new card...'
      });
      
      // Store card in MongoDB
      const res = await fetch("/api/cards/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCard),
      });

      const data = await res.json();

      // Minimum 2 second loading display
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (!res.ok) {
        // Show error dialog
        setActionDialog({
          open: true,
          status: 'error',
          title: 'Card Creation Failed',
          message: data?.error || "Failed to create card. Please try again."
        });
        return;
      }

      // Add the new card to the local state
      setCards([...cards, data.card]);
      setCardName(""); // Clear input after successful registration
      setSelectedBank(""); // Clear bank selection
      setError(""); // Clear any errors
      setShowForm(false); // Close dialog after submission
      
      // Show success dialog
      setActionDialog({
        open: true,
        status: 'success',
        title: 'Card Created Successfully!',
        message: `Your ${selectedBank} card has been created with RM 1,000 balance.`
      });
      
      console.log("Card created successfully:", data.cardId);
    } catch (err) {
      // Minimum 2 second loading display
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Show error dialog
      setActionDialog({
        open: true,
        status: 'error',
        title: 'Network Error',
        message: "Unable to connect to the server. Please check your connection and try again."
      });
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
      // Show loading dialog
      setActionDialog({
        open: true,
        status: 'loading',
        title: 'Deleting Card',
        message: 'Please wait while we delete your card...'
      });
      
      const res = await fetch(`/api/cards/delete?cardId=${selectedCard._id}`, {
        method: "DELETE",
      });

      // Minimum 2 second loading display
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (res.ok) {
        setCards(cards.filter(c => c._id !== selectedCard._id));
        setShowCardOptions(false);
        setSelectedCard(null);
        
        // Show success dialog
        setActionDialog({
          open: true,
          status: 'success',
          title: 'Card Deleted Successfully!',
          message: `Your ${selectedCard.bank} card has been permanently deleted.`
        });
      } else {
        const data = await res.json();
        
        // Show error dialog
        setActionDialog({
          open: true,
          status: 'error',
          title: 'Card Deletion Failed',
          message: data.error || "Failed to delete card. Please try again."
        });
      }
    } catch (error) {
      // Minimum 2 second loading display
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.error("Error deleting card:", error);
      
      // Show error dialog
      setActionDialog({
        open: true,
        status: 'error',
        title: 'Network Error',
        message: "Unable to connect to the server. Please check your connection and try again."
      });
    }
  };

  // Initialize face-api models (LAZY LOAD - only when needed)
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const loadModels = async () => {
    if (modelsLoaded) return; // Already loaded
    
    const MODEL_URL = "/models";
    try {
      console.log("Loading face detection models...");
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      setModelsLoaded(true);
      console.log("Face detection models loaded successfully");
    } catch (err) {
      console.error("Error loading face-api models:", err);
      throw err;
    }
  };

  // Handle face verification
  const handleFaceVerification = async () => {
    setShowCardOptions(false);
    setShowFaceVerification(true);
    
    try {
      // Load models only when face verification is needed
      if (!modelsLoaded) {
        console.log("Loading face models (first time)...");
        await loadModels();
      }
      
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
        {/* Modern Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 sm:mb-12"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                  My Cards
                </h1>
              </div>
              <p className="text-gray-600 text-base sm:text-lg ml-14">
                Manage your virtual bank accounts securely
              </p>
              {cards.length > 0 && !showForm && (
                <div className="flex items-center gap-2 ml-14">
                  <Badge variant="secondary" className="text-xs">
                    {cards.length} {cards.length === 1 ? 'Card' : 'Cards'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Total Balance: RM {cards.reduce((sum, card) => sum + (card.balance || 0), 0).toLocaleString()}
                  </Badge>
                </div>
              )}
            </div>
            
            {/* Create Card Button with Dialog */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
              <DialogTrigger asChild>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create New Card
                </Button>
              </DialogTrigger>
              
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                    </div>
                    <DialogTitle className="text-2xl">Create New Card</DialogTitle>
                  </div>
                  <DialogDescription>
                    Add a new virtual bank card to your account. Fill in the details below.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreateCard} className="space-y-6">
                  {/* Bank Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="bankSelect" className="text-gray-700 font-semibold">
                      Select Bank
                    </Label>
                    <Select 
                      value={selectedBank} 
                      onValueChange={setSelectedBank}
                      disabled={loading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a bank..." />
                      </SelectTrigger>
                      <SelectContent>
                        {malaysianBanks.map((bank) => (
                          <SelectItem key={bank} value={bank}>
                            {bank}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Cardholder Name */}
                  <div className="space-y-2">
                    <Label htmlFor="cardName" className="text-gray-700 font-semibold">
                      Cardholder Name
                    </Label>
                    <Input
                      id="cardName"
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Enter your name"
                      disabled={loading}
                      className="w-full"
                    />
                  </div>
                  
                  {/* Error Message */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Submit Buttons */}
                  <DialogFooter className="gap-3 sm:gap-2 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForm(false);
                        setCardName("");
                        setSelectedBank("");
                        setError("");
                      }}
                      disabled={loading}
                      className="flex-1 sm:flex-none"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      {loading ? (
                        <>
                          <Spinner className="mr-2" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Card
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* Enhanced Loading Skeleton */}
        {cardsLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full space-y-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <Spinner className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-semibold text-gray-800">Loading your cards...</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200/50 animate-pulse">
                  <div className="space-y-4">
                    <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-2/3"></div>
                    <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-full"></div>
                    <div className="flex justify-between gap-4">
                      <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/3"></div>
                      <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/4"></div>
                    </div>
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
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

        {/* Enhanced Card Options Modal */}
        {showCardOptions && selectedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowCardOptions(false);
              setSelectedCard(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Card Options</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowCardOptions(false);
                    setSelectedCard(null);
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Card Info Preview */}
              <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selectedCard.name}</p>
                    <p className="text-sm text-gray-600">{selectedCard.bank}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={handleFaceVerification}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  size="lg"
                >
                  <Eye className="h-5 w-5 mr-2" />
                  View Details
                </Button>
                
                {/* Delete Card with Confirmation */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="w-full"
                      size="lg"
                    >
                      <Trash2 className="h-5 w-5 mr-2" />
                      Delete Card
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your card
                        <span className="font-semibold text-gray-900"> {selectedCard?.name}</span> from
                        <span className="font-semibold text-gray-900"> {selectedCard?.bank}</span>.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteCard}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Button
                  onClick={() => {
                    setShowCardOptions(false);
                    setSelectedCard(null);
                  }}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Enhanced Face Verification Modal */}
        {showFaceVerification && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Scan className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Face Verification</h3>
                </div>
                <Badge variant={verificationStatus === 'success' ? 'default' : verificationStatus === 'error' ? 'destructive' : 'secondary'}>
                  {verificationStatus === 'success' ? 'Verified' : verificationStatus === 'error' ? 'Failed' : 'Scanning'}
                </Badge>
              </div>
              
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
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg"
                >
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-red-800">{verificationMessage}</p>
                </motion.div>
              )}
              
              {/* Action Buttons */}
              <div className="mt-6 flex gap-3">
                <Button
                  onClick={closeFaceVerification}
                  variant="outline"
                  size="lg"
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={captureFaceAndVerify}
                  disabled={faceVerifying || verificationStatus !== null}
                  size="lg"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {faceVerifying ? (
                    <>
                      <Spinner className="mr-2" />
                      Verifying...
                    </>
                  ) : verificationStatus === 'success' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Success!
                    </>
                  ) : verificationStatus === 'error' ? (
                    <>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Try Again
                    </>
                  ) : (
                    <>
                      <Scan className="h-4 w-4 mr-2" />
                      Scan Face
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Enhanced Card Details Modal (After Verification) */}
        {verifiedCardDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={closeCardDetails}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Success Header */}
              <div className="flex items-center justify-center mb-6">
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-center mb-2 text-gray-900">Verification Successful</h3>
              <p className="text-center text-gray-600 mb-6">Your card details are now accessible</p>

              {/* Card Details */}
              <div className="space-y-4 mb-6">
                {/* Bank */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <Label className="text-xs text-gray-600 uppercase tracking-wide">Bank</Label>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{verifiedCardDetails.bank}</p>
                </div>

                {/* Cardholder Name */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <Label className="text-xs text-gray-600 uppercase tracking-wide">Cardholder Name</Label>
                  <p className="text-lg font-semibold text-gray-900 mt-1 uppercase">{verifiedCardDetails.name}</p>
                </div>

                {/* Card Number */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <Label className="text-xs text-gray-600 uppercase tracking-wide">Card Number</Label>
                  <p className="text-lg font-mono text-gray-900 mt-1 tracking-wider">{formatAccountNumber(verifiedCardDetails.accountNumber)}</p>
                </div>

                {/* CVV & Expiry */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <Label className="text-xs text-gray-600 uppercase tracking-wide">CVV</Label>
                    <p className="text-lg font-mono text-gray-900 mt-1">{verifiedCardDetails.cvv}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <Label className="text-xs text-gray-600 uppercase tracking-wide">Expiry Date</Label>
                    <p className="text-lg font-mono text-gray-900 mt-1">{verifiedCardDetails.expiryDate}</p>
                  </div>
                </div>

                {/* Balance - Highlighted */}
                <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                  <Label className="text-xs text-green-700 uppercase tracking-wide font-semibold">Available Balance</Label>
                  <p className="text-3xl font-bold text-green-600 mt-2">RM {verifiedCardDetails.amount.toLocaleString()}</p>
                </div>
              </div>

              {/* Close Button */}
              <Button
                onClick={closeCardDetails}
                size="lg"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* Action Loading/Success/Error Dialog */}
        <Dialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ ...actionDialog, open: false })}>
          <DialogContent className="sm:max-w-md" showCloseButton={actionDialog.status !== 'loading'}>
            <div className="flex flex-col items-center justify-center py-6">
              {/* Loading State */}
              {actionDialog.status === 'loading' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="relative">
                    <Spinner className="h-16 w-16 text-blue-600" />
                    <motion.div
                      className="absolute inset-0 rounded-full border-4 border-blue-200"
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{actionDialog.title}</h3>
                    <p className="text-sm text-gray-600">{actionDialog.message}</p>
                  </div>
                </motion.div>
              )}

              {/* Success State */}
              {actionDialog.status === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="flex flex-col items-center gap-4"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="relative"
                  >
                    <div className="p-4 bg-green-100 rounded-full">
                      <CheckCircle2 className="h-16 w-16 text-green-600" />
                    </div>
                    <motion.div
                      className="absolute inset-0 rounded-full bg-green-400"
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 0.6 }}
                    />
                  </motion.div>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{actionDialog.title}</h3>
                    <p className="text-sm text-gray-600">{actionDialog.message}</p>
                  </div>
                  <Button
                    onClick={() => setActionDialog({ ...actionDialog, open: false })}
                    className="mt-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Done
                  </Button>
                </motion.div>
              )}

              {/* Error State */}
              {actionDialog.status === 'error' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="flex flex-col items-center gap-4"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: [0, -10, 10, -10, 0] }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="relative"
                  >
                    <div className="p-4 bg-red-100 rounded-full">
                      <AlertCircle className="h-16 w-16 text-red-600" />
                    </div>
                    <motion.div
                      className="absolute inset-0 rounded-full bg-red-400"
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 0.6 }}
                    />
                  </motion.div>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{actionDialog.title}</h3>
                    <p className="text-sm text-gray-600">{actionDialog.message}</p>
                  </div>
                  <Button
                    onClick={() => setActionDialog({ ...actionDialog, open: false })}
                    variant="destructive"
                    className="mt-4"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Close
                  </Button>
                </motion.div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}