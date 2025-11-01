"use client";

import { useState, useEffect, useRef } from "react";
import {
  Wallet,
  ArrowRightLeft,
  Receipt,
  FileText,
  DollarSign,
  Sparkles,
  Send,
  Check,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function AIAssistantCard({ userName = "Robert", onPromptClick, onSendMessage }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [typingMessageIndex, setTypingMessageIndex] = useState(null);
  const [displayedText, setDisplayedText] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, displayedText]);

  // Typing animation effect
  useEffect(() => {
    if (typingMessageIndex !== null && messages[typingMessageIndex]) {
      const fullText = messages[typingMessageIndex].content;
      let currentIndex = 0;
      setDisplayedText("");

      const typingInterval = setInterval(() => {
        if (currentIndex <= fullText.length) {
          setDisplayedText(fullText.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setTypingMessageIndex(null);
        }
      }, 20); // Speed of typing (20ms per character)

      return () => clearInterval(typingInterval);
    }
  }, [typingMessageIndex, messages]);

  const handleSend = async () => {
    if (message.trim() && onSendMessage) {
      const userMessage = message.trim();
      
      // Add user message to chat
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
      setMessage("");
      setIsLoading(true);
      setShowQuickReplies(false);
      
      try {
        // Call the onSendMessage callback (which should return a promise with response)
        const response = await onSendMessage(userMessage);
        setIsLoading(false);
        
        // Add assistant response to chat
        if (response && response.reply) {
          setMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);
          // Trigger typing animation for the new message
          setMessages(prev => {
            setTypingMessageIndex(prev.length - 1);
            return prev;
          });
          // Check if response requires confirmation (look for bullet points and "proceed")
          if ((response.reply.includes('•') || response.reply.toLowerCase().includes('confirm the following')) && 
              (response.reply.toLowerCase().includes('proceed') || 
               response.reply.toLowerCase().includes('do you want'))) {
            setShowQuickReplies(true);
          }
        } else if (response && response.error) {
          setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${response.error}` }]);
        }
      } catch (error) {
        console.error("Error sending message:", error);
        setIsLoading(false);
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }]);
      }
    }
  };

  const handleQuickReply = async (reply) => {
    setShowQuickReplies(false);
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: reply }]);
    setIsLoading(true);
    
    try {
      const response = await onSendMessage(reply);
      setIsLoading(false);
      
      if (response && response.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);
        // Trigger typing animation for the new message
        setMessages(prev => {
          setTypingMessageIndex(prev.length - 1);
          return prev;
        });
        // Check if response requires confirmation again (look for bullet points and "proceed")
        if ((response.reply.includes('•') || response.reply.toLowerCase().includes('confirm the following')) && 
            (response.reply.toLowerCase().includes('proceed') || 
             response.reply.toLowerCase().includes('do you want'))) {
          setShowQuickReplies(true);
        }
      } else if (response && response.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${response.error}` }]);
      }
    } catch (error) {
      console.error("Error sending quick reply:", error);
      setIsLoading(false);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }]);
    }
  };

  const handlePromptClickInternal = async (prompt) => {
    if (onPromptClick) {
      // Add user's badge click as a message
      setMessages(prev => [...prev, { role: 'user', content: prompt }]);
      setIsLoading(true);
      setShowQuickReplies(false);
      
      try {
        // Call parent's handlePromptClick which maps and sends to API
        const response = await onPromptClick(prompt);
        setIsLoading(false);
        
        // Add assistant response
        if (response && response.reply) {
          setMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);
          // Trigger typing animation for the new message
          setMessages(prev => {
            setTypingMessageIndex(prev.length - 1);
            return prev;
          });
          // Check if response requires confirmation (look for bullet points and "proceed")
          if ((response.reply.includes('•') || response.reply.toLowerCase().includes('confirm the following')) && 
              (response.reply.toLowerCase().includes('proceed') || 
               response.reply.toLowerCase().includes('do you want'))) {
            setShowQuickReplies(true);
          }
        } else if (response && response.error) {
          setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${response.error}` }]);
        }
      } catch (error) {
        console.error("Error handling prompt:", error);
        setIsLoading(false);
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }]);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="flex w-full max-w-5xl mx-auto flex-col gap-4 p-6 shadow-none" style={{ height: '90vh', maxHeight: '900px' }}>
      <div className="flex flex-row items-center justify-end p-0">
        <Button variant="ghost" size="icon" className="size-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            viewBox="0 0 24 24"
            className="size-4 text-muted-foreground"
          >
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 5a1 1 0 1 0 2 0a1 1 0 1 0-2 0m7 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0m7 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0M4 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0m7 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0m7 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0M4 19a1 1 0 1 0 2 0a1 1 0 1 0-2 0m7 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0m7 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0"
            />
          </svg>
        </Button>
        <Button variant="ghost" size="icon" className="size-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4 text-muted-foreground"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M18 6l-12 12" />
            <path d="M6 6l12 12" />
          </svg>
        </Button>
      </div>
      <CardContent className="flex flex-1 flex-col p-0 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-6 p-8 flex-1">
            <svg
            fill="none"
            height="48"
            viewBox="0 0 48 48"
            width="48"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
          >
            <filter
              id="a"
              colorInterpolationFilters="sRGB"
              filterUnits="userSpaceOnUse"
              height="54"
              width="48"
              x="0"
              y="-3"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend
                in="SourceGraphic"
                in2="BackgroundImageFix"
                mode="normal"
                result="shape"
              />
              <feColorMatrix
                in="SourceAlpha"
                result="hardAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              />
              <feOffset dy="-3" />
              <feGaussianBlur stdDeviation="1.5" />
              <feComposite
                in2="hardAlpha"
                k2="-1"
                k3="1"
                operator="arithmetic"
              />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"
              />
              <feBlend
                in2="shape"
                mode="normal"
                result="effect1_innerShadow_3051_46851"
              />
              <feColorMatrix
                in="SourceAlpha"
                result="hardAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              />
              <feOffset dy="3" />
              <feGaussianBlur stdDeviation="1.5" />
              <feComposite
                in2="hardAlpha"
                k2="-1"
                k3="1"
                operator="arithmetic"
              />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.1 0"
              />
              <feBlend
                in2="effect1_innerShadow_3051_46851"
                mode="normal"
                result="effect2_innerShadow_3051_46851"
              />
              <feColorMatrix
                in="SourceAlpha"
                result="hardAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              />
              <feMorphology
                in="SourceAlpha"
                operator="erode"
                radius="1"
                result="effect3_innerShadow_3051_46851"
              />
              <feOffset />
              <feComposite
                in2="hardAlpha"
                k2="-1"
                k3="1"
                operator="arithmetic"
              />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0.0627451 0 0 0 0 0.0941176 0 0 0 0 0.156863 0 0 0 0.24 0"
              />
              <feBlend
                in2="effect2_innerShadow_3051_46851"
                mode="normal"
                result="effect3_innerShadow_3051_46851"
              />
            </filter>
            <filter
              id="b"
              colorInterpolationFilters="sRGB"
              filterUnits="userSpaceOnUse"
              height="42"
              width="42"
              x="3"
              y="5.25"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix
                in="SourceAlpha"
                result="hardAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              />
              <feMorphology
                in="SourceAlpha"
                operator="erode"
                radius="1.5"
                result="effect1_dropShadow_3051_46851"
              />
              <feOffset dy="2.25" />
              <feGaussianBlur stdDeviation="2.25" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0.141176 0 0 0 0 0.141176 0 0 0 0 0.141176 0 0 0 0.1 0"
              />
              <feBlend
                in2="BackgroundImageFix"
                mode="normal"
                result="effect1_dropShadow_3051_46851"
              />
              <feBlend
                in="SourceGraphic"
                in2="effect1_dropShadow_3051_46851"
                mode="normal"
                result="shape"
              />
            </filter>
            <linearGradient
              id="c"
              gradientUnits="userSpaceOnUse"
              x1="24"
              x2="26"
              y1=".000001"
              y2="48"
            >
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="1" stopColor="#fff" stopOpacity=".12" />
            </linearGradient>
            <linearGradient
              id="d"
              gradientUnits="userSpaceOnUse"
              x1="24"
              x2="24"
              y1="6"
              y2="42"
            >
              <stop offset="0" stopColor="#fff" stopOpacity=".8" />
              <stop offset="1" stopColor="#fff" stopOpacity=".5" />
            </linearGradient>
            <linearGradient
              id="e"
              gradientUnits="userSpaceOnUse"
              x1="24"
              x2="24"
              y1="0"
              y2="48"
            >
              <stop offset="0" stopColor="#fff" stopOpacity=".12" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <clipPath id="f">
              <rect height="48" rx="12" width="48" />
            </clipPath>
            <g filter="url(#a)">
              <g clipPath="url(#f)">
                <rect fill="#0A0D12" height="48" rx="12" width="48" />
                <path d="m0 0h48v48h-48z" fill="url(#c)" />
                <g filter="url(#b)">
                  <path
                    clipRule="evenodd"
                    d="m6 24c11.4411 0 18-6.5589 18-18 0 11.4411 6.5589 18 18 18-11.4411 0-18 6.5589-18 18 0-11.4411-6.5589-18-18-18z"
                    fill="url(#d)"
                    fillRule="evenodd"
                  />
                </g>
              </g>
              <rect
                height="46"
                rx="11"
                stroke="url(#e)"
                strokeWidth="2"
                width="46"
                x="1"
                y="1"
              />
            </g>
          </svg>

          <div className="flex flex-col space-y-2 text-center">
            <div className="flex flex-col">
              <h2 className="text-xl font-medium tracking-tight text-muted-foreground">
                Hi {userName},
              </h2>
              <h3 className="text-lg font-medium tracking-[-0.006em]">
                Welcome back! How can I help?
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              I'm here to help you with your banking needs. Choose from the options
              below or just tell me what you need!
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge
              variant="secondary"
              className="h-7 min-w-7 cursor-pointer gap-1.5 [&_svg]:-ms-px [&_svg]:shrink-0 text-xs [&_svg]:size-3.5 rounded-md"
              onClick={() => handlePromptClickInternal("Check Balance")}
            >
              <Wallet aria-hidden="true" className="text-blue-500" />
              Check Balance
            </Badge>
            <Badge
              variant="secondary"
              className="h-7 min-w-7 cursor-pointer gap-1.5 [&_svg]:-ms-px [&_svg]:shrink-0 text-xs [&_svg]:size-3.5 rounded-md"
              onClick={() => handlePromptClickInternal("Transfer Money")}
            >
              <ArrowRightLeft
                aria-hidden="true"
                className="text-orange-500"
              />
              Transfer Money
            </Badge>
            <Badge
              variant="secondary"
              className="h-7 min-w-7 cursor-pointer gap-1.5 [&_svg]:-ms-px [&_svg]:shrink-0 text-xs [&_svg]:size-3.5 rounded-md"
              onClick={() => handlePromptClickInternal("Make Payment")}
            >
              <DollarSign aria-hidden="true" className="text-green-500" />
              Make Payment
            </Badge>
            <Badge
              variant="secondary"
              className="h-7 min-w-7 cursor-pointer gap-1.5 [&_svg]:-ms-px [&_svg]:shrink-0 text-xs [&_svg]:size-3.5 rounded-md"
              onClick={() => handlePromptClickInternal("View Transactions")}
            >
              <Receipt aria-hidden="true" className="text-pink-500" />
              View Transactions
            </Badge>
            <Badge
              variant="secondary"
              className="h-7 min-w-7 cursor-pointer gap-1.5 [&_svg]:-ms-px [&_svg]:shrink-0 text-xs [&_svg]:size-3.5 rounded-md"
              onClick={() => handlePromptClickInternal("Download Statement")}
            >
              <FileText aria-hidden="true" className="text-yellow-500" />
              Download Statement
            </Badge>
            <Badge
              variant="secondary"
              className="h-7 min-w-7 cursor-pointer gap-1.5 [&_svg]:-ms-px [&_svg]:shrink-0 text-xs [&_svg]:size-3.5 rounded-md"
              onClick={() => handlePromptClickInternal("Help")}
            >
              <Sparkles aria-hidden="true" className="text-purple-500" />
              Help
            </Badge>
          </div>
        </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-foreground'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">
                    {msg.role === 'assistant' && typingMessageIndex === i 
                      ? displayedText 
                      : msg.content}
                    {msg.role === 'assistant' && typingMessageIndex === i && displayedText.length < msg.content.length && (
                      <span className="inline-block w-1 h-4 bg-current ml-0.5 animate-pulse"></span>
                    )}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Quick Reply Buttons (Yes/No) */}
        {showQuickReplies && (
          <div className="flex gap-3 px-6 pb-4 justify-center">
            <Button
              onClick={() => handleQuickReply("Yes")}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg shadow-md transition-all hover:scale-105"
            >
              <Check className="h-4 w-4" />
              Yes
            </Button>
            <Button
              onClick={() => handleQuickReply("No")}
              variant="outline"
              className="flex items-center gap-2 border-2 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 px-6 py-2 rounded-lg shadow-md transition-all hover:scale-105"
            >
              <X className="h-4 w-4" />
              No
            </Button>
          </div>
        )}

        <div className="relative mt-auto pt-4">
          <div className="relative rounded-md ring-1 ring-border">
            <Textarea
              placeholder="Type your message here..."
              className="min-h-[80px] resize-none border-none py-3 px-4 shadow-none focus-visible:ring-0 text-sm"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            
            <Button
              onClick={handleSend}
              disabled={!message.trim()}
              size="icon"
              className="absolute bottom-3 right-3 h-8 w-8 rounded-md"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-xs text-center text-muted-foreground mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
