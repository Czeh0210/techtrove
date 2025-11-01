"use client";"use client";



import { useState, useEffect, useRef } from "react";import { useState, useEffect, useRef } from "react";

import {import {

  Wallet,  Wallet,

  ArrowRightLeft,  ArrowRightLeft,

  Receipt,  Receipt,

  FileText,  FileText,

  DollarSign,  DollarSign,

  Sparkles,  Sparkles,

  Send,  Send,

  Check,  Check,

  X,  X,

} from "lucide-react";} from "lucide-react";



import { Badge } from "@/components/ui/badge";import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";import { Button } from "@/components/ui/button";

import { Card, CardContent } from "@/components/ui/card";import { Card, CardContent } from "@/components/ui/card";

import { Textarea } from "@/components/ui/textarea";import { Textarea } from "@/components/ui/textarea";



export function AIAssistantCard({ userName = "User", onPromptClick, onSendMessage }) {export function AIAssistantCard({ userName = "Robert", onPromptClick, onSendMessage }) {

  const [message, setMessage] = useState("");  const [message, setMessage] = useState("");

  const [messages, setMessages] = useState([]);  const [messages, setMessages] = useState([]);

  const [isLoading, setIsLoading] = useState(false);  const [isLoading, setIsLoading] = useState(false);

  const [showQuickReplies, setShowQuickReplies] = useState(false);  const [showQuickReplies, setShowQuickReplies] = useState(false);

  const [typingMessageIndex, setTypingMessageIndex] = useState(null);  const [typingMessageIndex, setTypingMessageIndex] = useState(null);

  const [displayedText, setDisplayedText] = useState("");  const [displayedText, setDisplayedText] = useState("");

  const messagesEndRef = useRef(null);  const messagesEndRef = useRef(null);



  const scrollToBottom = () => {  const scrollToBottom = () => {

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  };  };



  useEffect(() => {  useEffect(() => {

    scrollToBottom();    scrollToBottom();

  }, [messages, displayedText]);  }, [messages, displayedText]);



  // Typing animation effect  // Typing animation effect

  useEffect(() => {  useEffect(() => {

    if (typingMessageIndex !== null && messages[typingMessageIndex]) {    if (typingMessageIndex !== null && messages[typingMessageIndex]) {

      const fullText = messages[typingMessageIndex].content;      const fullText = messages[typingMessageIndex].content;

      let currentIndex = 0;      let currentIndex = 0;

      setDisplayedText("");      setDisplayedText("");



      const typingInterval = setInterval(() => {      const typingInterval = setInterval(() => {

        if (currentIndex <= fullText.length) {        if (currentIndex <= fullText.length) {

          setDisplayedText(fullText.slice(0, currentIndex));          setDisplayedText(fullText.slice(0, currentIndex));

          currentIndex++;          currentIndex++;

        } else {        } else {

          clearInterval(typingInterval);          clearInterval(typingInterval);

          setTypingMessageIndex(null);          setTypingMessageIndex(null);

        }        }

      }, 20);      }, 20); // Speed of typing (20ms per character)



      return () => clearInterval(typingInterval);      return () => clearInterval(typingInterval);

    }    }

  }, [typingMessageIndex, messages]);  }, [typingMessageIndex, messages]);



  const handleSend = async () => {  const handleSend = async () => {

    if (message.trim() && onSendMessage) {    if (message.trim() && onSendMessage) {

      const userMessage = message.trim();      const userMessage = message.trim();

            

      // Add user message to chat      // Add user message to chat

      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

      setMessage("");      setMessage("");

      setIsLoading(true);      setIsLoading(true);

      setShowQuickReplies(false);      setShowQuickReplies(false);

            

      try {      try {

        const response = await onSendMessage(userMessage);        // Call the onSendMessage callback (which should return a promise with response)

        setIsLoading(false);        const response = await onSendMessage(userMessage);

                setIsLoading(false);

        if (response && response.reply) {        

          const newMessage = {         // Add assistant response to chat

            role: 'assistant',         if (response && response.reply) {

            content: response.reply,          const newMessage = { 

            redirect: response.redirect,            role: 'assistant', 

            redirectLabel: response.redirectLabel            content: response.reply,

          };            redirect: response.redirect,

          setMessages(prev => [...prev, newMessage]);            redirectLabel: response.redirectLabel

          setMessages(prev => {          };

            setTypingMessageIndex(prev.length - 1);          setMessages(prev => [...prev, newMessage]);

            return prev;          // Trigger typing animation for the new message

          });          setMessages(prev => {

                      setTypingMessageIndex(prev.length - 1);

          if ((response.reply.includes('•') || response.reply.toLowerCase().includes('confirm the following')) &&             return prev;

              (response.reply.toLowerCase().includes('proceed') ||           });

               response.reply.toLowerCase().includes('do you want'))) {          // Check if response requires confirmation (look for bullet points and "proceed")

            setShowQuickReplies(true);          if ((response.reply.includes('•') || response.reply.toLowerCase().includes('confirm the following')) && 

          }              (response.reply.toLowerCase().includes('proceed') || 

        } else if (response && response.error) {               response.reply.toLowerCase().includes('do you want'))) {

          setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${response.error}` }]);            setShowQuickReplies(true);

        }          }

      } catch (error) {        } else if (response && response.error) {

        console.error("Error sending message:", error);          setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${response.error}` }]);

        setIsLoading(false);        }

        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }]);      } catch (error) {

      }        console.error("Error sending message:", error);

    }        setIsLoading(false);

  };        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }]);

      }

  const handleQuickReply = async (reply) => {    }

    setShowQuickReplies(false);  };

    setMessages(prev => [...prev, { role: 'user', content: reply }]);

    setIsLoading(true);  const handleQuickReply = async (reply) => {

        setShowQuickReplies(false);

    try {    // Add user message to chat

      const response = await onSendMessage(reply);    setMessages(prev => [...prev, { role: 'user', content: reply }]);

      setIsLoading(false);    setIsLoading(true);

          

      if (response && response.reply) {    try {

        setMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);      const response = await onSendMessage(reply);

        setMessages(prev => {      setIsLoading(false);

          setTypingMessageIndex(prev.length - 1);      

          return prev;      if (response && response.reply) {

        });        setMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);

      }        // Trigger typing animation for the new message

    } catch (error) {        setMessages(prev => {

      console.error("Error:", error);          setTypingMessageIndex(prev.length - 1);

      setIsLoading(false);          return prev;

    }        });

  };        // Check if response requires confirmation again (look for bullet points and "proceed")

        if ((response.reply.includes('•') || response.reply.toLowerCase().includes('confirm the following')) && 

  const handleKeyDown = (e) => {            (response.reply.toLowerCase().includes('proceed') || 

    if (e.key === "Enter" && !e.shiftKey) {             response.reply.toLowerCase().includes('do you want'))) {

      e.preventDefault();          setShowQuickReplies(true);

      handleSend();        }

    }      } else if (response && response.error) {

  };        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${response.error}` }]);

      }

  const handlePromptClickInternal = async (prompt) => {    } catch (error) {

    if (prompt === "View Transactions") {      console.error("Error sending quick reply:", error);

      window.location.href = '/dashboard';      setIsLoading(false);

      return;      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }]);

    }    }

      };

    if (onPromptClick) {

      setMessages(prev => [...prev, { role: 'user', content: prompt }]);  const handlePromptClickInternal = async (prompt) => {

      setIsLoading(true);    // Special handling for View Transactions - redirect to dashboard

      setShowQuickReplies(false);    if (prompt === "View Transactions") {

            window.location.href = '/dashboard';

      try {      return;

        const response = await onPromptClick(prompt);    }

        setIsLoading(false);    

            if (onPromptClick) {

        if (response && response.reply) {      // Add user's badge click as a message

          const newMessage = {       setMessages(prev => [...prev, { role: 'user', content: prompt }]);

            role: 'assistant',       setIsLoading(true);

            content: response.reply,      setShowQuickReplies(false);

            redirect: response.redirect,      

            redirectLabel: response.redirectLabel      try {

          };        // Call parent's handlePromptClick which maps and sends to API

          setMessages(prev => [...prev, newMessage]);        const response = await onPromptClick(prompt);

          setMessages(prev => {        setIsLoading(false);

            setTypingMessageIndex(prev.length - 1);        

            return prev;        // Add assistant response

          });        if (response && response.reply) {

        }          setMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);

      } catch (error) {          // Trigger typing animation for the new message

        console.error("Error:", error);          setMessages(prev => {

        setIsLoading(false);            setTypingMessageIndex(prev.length - 1);

      }            return prev;

    }          });

  };          // Check if response requires confirmation (look for bullet points and "proceed")

          if ((response.reply.includes('•') || response.reply.toLowerCase().includes('confirm the following')) && 

  return (              (response.reply.toLowerCase().includes('proceed') || 

    <Card className="w-full h-[calc(100vh-2rem)] max-h-[800px] flex flex-col shadow-2xl border-2 border-primary/20 bg-gradient-to-br from-background to-muted/30">               response.reply.toLowerCase().includes('do you want'))) {

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">            setShowQuickReplies(true);

        {messages.length === 0 ? (          }

        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">        } else if (response && response.error) {

          <div className="flex flex-col space-y-2 text-center">          setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${response.error}` }]);

            <div className="flex flex-col items-center">        }

              <div className="mb-2 px-6 py-2 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full border border-primary/30">      } catch (error) {

                <h2 className="text-xl font-semibold tracking-tight text-primary">        console.error("Error handling prompt:", error);

                  Hi {userName}! 👋        setIsLoading(false);

                </h2>        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }]);

              </div>      }

              <h3 className="text-lg font-medium tracking-[-0.006em] text-foreground">    }

                Welcome to TechTrove Banking  };

              </h3>

            </div>  const handleKeyDown = (e) => {

            <p className="text-sm text-muted-foreground max-w-md">    if (e.key === 'Enter' && !e.shiftKey) {

              I'm here to help you with your banking needs. Choose from the options      e.preventDefault();

              below or just tell me what you need!      handleSend();

            </p>    }

          </div>  };



          <div className="flex flex-wrap items-center justify-center gap-3 max-w-2xl">  return (

            <Badge    <Card className="flex w-full max-w-5xl mx-auto flex-col gap-4 p-6 shadow-2xl border-2 border-primary/10 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm" style={{ height: '90vh', maxHeight: '900px' }}>

              variant="secondary"      <CardContent className="flex flex-1 flex-col p-0 min-h-0">

              className="h-9 min-w-9 cursor-pointer gap-2 [&_svg]:-ms-px [&_svg]:shrink-0 text-sm [&_svg]:size-4 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-xl hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950 border-2"        {messages.length === 0 ? (

              onClick={() => handlePromptClickInternal("Check Balance")}          <div className="flex flex-col items-center justify-center space-y-6 p-8 flex-1">

            >            <svg

              <Wallet aria-hidden="true" className="text-blue-500" />            fill="none"

              Check Balance            height="48"

            </Badge>            viewBox="0 0 48 48"

            <Badge            width="48"

              variant="secondary"            xmlns="http://www.w3.org/2000/svg"

              className="h-9 min-w-9 cursor-pointer gap-2 [&_svg]:-ms-px [&_svg]:shrink-0 text-sm [&_svg]:size-4 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-xl hover:bg-orange-50 hover:border-orange-300 dark:hover:bg-orange-950 border-2"            xmlnsXlink="http://www.w3.org/1999/xlink"

              onClick={() => handlePromptClickInternal("Transfer Money")}          >

            >            <filter

              <ArrowRightLeft              id="a"

                aria-hidden="true"              colorInterpolationFilters="sRGB"

                className="text-orange-500"              filterUnits="userSpaceOnUse"

              />              height="54"

              Transfer Money              width="48"

            </Badge>              x="0"

            <Badge              y="-3"

              variant="secondary"            >

              className="h-9 min-w-9 cursor-pointer gap-2 [&_svg]:-ms-px [&_svg]:shrink-0 text-sm [&_svg]:size-4 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-xl hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-950 border-2"              <feFlood floodOpacity="0" result="BackgroundImageFix" />

              onClick={() => handlePromptClickInternal("Make Payment")}              <feBlend

            >                in="SourceGraphic"

              <DollarSign aria-hidden="true" className="text-green-500" />                in2="BackgroundImageFix"

              Make Payment                mode="normal"

            </Badge>                result="shape"

            <Badge              />

              variant="secondary"              <feColorMatrix

              className="h-9 min-w-9 cursor-pointer gap-2 [&_svg]:-ms-px [&_svg]:shrink-0 text-sm [&_svg]:size-4 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-xl hover:bg-pink-50 hover:border-pink-300 dark:hover:bg-pink-950 border-2"                in="SourceAlpha"

              onClick={() => handlePromptClickInternal("View Transactions")}                result="hardAlpha"

            >                type="matrix"

              <Receipt aria-hidden="true" className="text-pink-500" />                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"

              View Transactions              />

            </Badge>              <feOffset dy="-3" />

            <Badge              <feGaussianBlur stdDeviation="1.5" />

              variant="secondary"              <feComposite

              className="h-9 min-w-9 cursor-pointer gap-2 [&_svg]:-ms-px [&_svg]:shrink-0 text-sm [&_svg]:size-4 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-xl hover:bg-yellow-50 hover:border-yellow-300 dark:hover:bg-yellow-950 border-2"                in2="hardAlpha"

              onClick={() => handlePromptClickInternal("Download Statement")}                k2="-1"

            >                k3="1"

              <FileText aria-hidden="true" className="text-yellow-500" />                operator="arithmetic"

              Download Statement              />

            </Badge>              <feColorMatrix

            <Badge                type="matrix"

              variant="secondary"                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"

              className="h-9 min-w-9 cursor-pointer gap-2 [&_svg]:-ms-px [&_svg]:shrink-0 text-sm [&_svg]:size-4 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-xl hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-950 border-2"              />

              onClick={() => handlePromptClickInternal("Help")}              <feBlend

            >                in2="shape"

              <Sparkles aria-hidden="true" className="text-purple-500" />                mode="normal"

              Help                result="effect1_innerShadow_3051_46851"

            </Badge>              />

          </div>              <feColorMatrix

        </div>                in="SourceAlpha"

        ) : (                result="hardAlpha"

          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 scroll-smooth">                type="matrix"

            {messages.map((msg, i) => (                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"

              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>              />

                <div className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-md ${              <feOffset dy="3" />

                  msg.role === 'user'               <feGaussianBlur stdDeviation="1.5" />

                    ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'               <feComposite

                    : 'bg-gradient-to-br from-muted to-muted/50 text-foreground border border-border'                in2="hardAlpha"

                }`}>                k2="-1"

                  <p className="text-sm whitespace-pre-wrap">                k3="1"

                    {msg.role === 'assistant' && typingMessageIndex === i                 operator="arithmetic"

                      ? displayedText               />

                      : msg.content}              <feColorMatrix

                    {msg.role === 'assistant' && typingMessageIndex === i && displayedText.length < msg.content.length && (                type="matrix"

                      <span className="inline-block w-1 h-4 bg-current ml-0.5 animate-pulse"></span>                values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.1 0"

                    )}              />

                  </p>              <feBlend

                  {msg.redirect && msg.redirectLabel && (                in2="effect1_innerShadow_3051_46851"

                    <a                 mode="normal"

                      href={msg.redirect}                result="effect2_innerShadow_3051_46851"

                      className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all hover:scale-105 shadow-md text-sm font-medium"              />

                    >              <feColorMatrix

                      {msg.redirectLabel}                in="SourceAlpha"

                    </a>                result="hardAlpha"

                  )}                type="matrix"

                </div>                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"

              </div>              />

            ))}              <feMorphology

            {isLoading && (                in="SourceAlpha"

              <div className="flex justify-start">                operator="erode"

                <div className="bg-muted rounded-2xl px-4 py-3">                radius="1"

                  <div className="flex gap-1">                result="effect3_innerShadow_3051_46851"

                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>              />

                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>              <feOffset />

                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>              <feComposite

                  </div>                in2="hardAlpha"

                </div>                k2="-1"

              </div>                k3="1"

            )}                operator="arithmetic"

            <div ref={messagesEndRef} />              />

          </div>              <feColorMatrix

        )}                type="matrix"

                values="0 0 0 0 0.0627451 0 0 0 0 0.0941176 0 0 0 0 0.156863 0 0 0 0.24 0"

        {showQuickReplies && (              />

          <div className="flex gap-3 px-6 pb-4 justify-center animate-in slide-in-from-bottom duration-300">              <feBlend

            <Button                in2="effect2_innerShadow_3051_46851"

              onClick={() => handleQuickReply("Yes")}                mode="normal"

              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-2.5 rounded-xl shadow-lg transition-all hover:scale-105 hover:shadow-xl"                result="effect3_innerShadow_3051_46851"

            >              />

              <Check className="h-5 w-5" />            </filter>

              Yes, Confirm            <filter

            </Button>              id="b"

            <Button              colorInterpolationFilters="sRGB"

              onClick={() => handleQuickReply("No")}              filterUnits="userSpaceOnUse"

              variant="outline"              height="42"

              className="flex items-center gap-2 border-2 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 px-8 py-2.5 rounded-xl shadow-lg transition-all hover:scale-105 hover:shadow-xl"              width="42"

            >              x="3"

              <X className="h-5 w-5" />              y="5.25"

              No, Cancel            >

            </Button>              <feFlood floodOpacity="0" result="BackgroundImageFix" />

          </div>              <feColorMatrix

        )}                in="SourceAlpha"

                result="hardAlpha"

        <div className="relative mt-auto pt-4 px-6 pb-6">                type="matrix"

          <div className="relative rounded-xl ring-2 ring-primary/20 focus-within:ring-primary/40 transition-all duration-200 shadow-lg">                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"

            <Textarea              />

              placeholder="Type your message here..."              <feMorphology

              className="min-h-[80px] resize-none border-none py-3 px-4 shadow-none focus-visible:ring-0 text-sm bg-background/50 rounded-xl"                in="SourceAlpha"

              value={message}                operator="erode"

              onChange={(e) => setMessage(e.target.value)}                radius="1.5"

              onKeyDown={handleKeyDown}                result="effect1_dropShadow_3051_46851"

            />              />

                          <feOffset dy="2.25" />

            <Button              <feGaussianBlur stdDeviation="2.25" />

              onClick={handleSend}              <feComposite in2="hardAlpha" operator="out" />

              disabled={!message.trim()}              <feColorMatrix

              size="icon"                type="matrix"

              className="absolute bottom-3 right-3 h-9 w-9 rounded-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"                values="0 0 0 0 0.141176 0 0 0 0 0.141176 0 0 0 0 0.141176 0 0 0 0.1 0"

            >              />

              <Send className="h-4 w-4" />              <feBlend

            </Button>                in2="BackgroundImageFix"

          </div>                mode="normal"

                          result="effect1_dropShadow_3051_46851"

          <p className="text-xs text-center text-muted-foreground mt-2 flex items-center justify-center gap-1">              />

            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] border">Enter</kbd> to send •               <feBlend

            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] border">Shift+Enter</kbd> for new line                in="SourceGraphic"

          </p>                in2="effect1_dropShadow_3051_46851"

        </div>                mode="normal"

      </CardContent>                result="shape"

    </Card>              />

  );            </filter>

}            <linearGradient

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
            <div className="flex flex-col items-center">
              <div className="mb-2 px-6 py-2 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full border border-primary/30">
                <h2 className="text-xl font-semibold tracking-tight text-primary">
                  Hi {userName}! 👋
                </h2>
              </div>
              <h3 className="text-lg font-medium tracking-[-0.006em] text-foreground">
                Welcome to TechTrove Banking
              </h3>
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              I'm here to help you with your banking needs. Choose from the options
              below or just tell me what you need!
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 max-w-2xl">
            <Badge
              variant="secondary"
              className="h-9 min-w-9 cursor-pointer gap-2 [&_svg]:-ms-px [&_svg]:shrink-0 text-sm [&_svg]:size-4 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-xl hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950 border-2"
              onClick={() => handlePromptClickInternal("Check Balance")}
            >
              <Wallet aria-hidden="true" className="text-blue-500" />
              Check Balance
            </Badge>
            <Badge
              variant="secondary"
              className="h-9 min-w-9 cursor-pointer gap-2 [&_svg]:-ms-px [&_svg]:shrink-0 text-sm [&_svg]:size-4 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-xl hover:bg-orange-50 hover:border-orange-300 dark:hover:bg-orange-950 border-2"
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
              className="h-9 min-w-9 cursor-pointer gap-2 [&_svg]:-ms-px [&_svg]:shrink-0 text-sm [&_svg]:size-4 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-xl hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-950 border-2"
              onClick={() => handlePromptClickInternal("Make Payment")}
            >
              <DollarSign aria-hidden="true" className="text-green-500" />
              Make Payment
            </Badge>
            <Badge
              variant="secondary"
              className="h-9 min-w-9 cursor-pointer gap-2 [&_svg]:-ms-px [&_svg]:shrink-0 text-sm [&_svg]:size-4 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-xl hover:bg-pink-50 hover:border-pink-300 dark:hover:bg-pink-950 border-2"
              onClick={() => handlePromptClickInternal("View Transactions")}
            >
              <Receipt aria-hidden="true" className="text-pink-500" />
              View Transactions
            </Badge>
            <Badge
              variant="secondary"
              className="h-9 min-w-9 cursor-pointer gap-2 [&_svg]:-ms-px [&_svg]:shrink-0 text-sm [&_svg]:size-4 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-xl hover:bg-yellow-50 hover:border-yellow-300 dark:hover:bg-yellow-950 border-2"
              onClick={() => handlePromptClickInternal("Download Statement")}
            >
              <FileText aria-hidden="true" className="text-yellow-500" />
              Download Statement
            </Badge>
            <Badge
              variant="secondary"
              className="h-9 min-w-9 cursor-pointer gap-2 [&_svg]:-ms-px [&_svg]:shrink-0 text-sm [&_svg]:size-4 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-xl hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-950 border-2"
              onClick={() => handlePromptClickInternal("Help")}
            >
              <Sparkles aria-hidden="true" className="text-purple-500" />
              Help
            </Badge>
          </div>
        </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 scroll-smooth">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-md ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground' 
                    : 'bg-gradient-to-br from-muted to-muted/50 text-foreground border border-border'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">
                    {msg.role === 'assistant' && typingMessageIndex === i 
                      ? displayedText 
                      : msg.content}
                    {msg.role === 'assistant' && typingMessageIndex === i && displayedText.length < msg.content.length && (
                      <span className="inline-block w-1 h-4 bg-current ml-0.5 animate-pulse"></span>
                    )}
                  </p>
                  {/* Show action button if message has redirect */}
                  {msg.redirect && msg.redirectLabel && (
                    <a 
                      href={msg.redirect}
                      className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all hover:scale-105 shadow-md text-sm font-medium"
                    >
                      {msg.redirectLabel}
                    </a>
                  )}
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
          <div className="flex gap-3 px-6 pb-4 justify-center animate-in slide-in-from-bottom duration-300">
            <Button
              onClick={() => handleQuickReply("Yes")}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-2.5 rounded-xl shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            >
              <Check className="h-5 w-5" />
              Yes, Confirm
            </Button>
            <Button
              onClick={() => handleQuickReply("No")}
              variant="outline"
              className="flex items-center gap-2 border-2 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 px-8 py-2.5 rounded-xl shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            >
              <X className="h-5 w-5" />
              No, Cancel
            </Button>
          </div>
        )}

        <div className="relative mt-auto pt-4">
          <div className="relative rounded-xl ring-2 ring-primary/20 focus-within:ring-primary/40 transition-all duration-200 shadow-lg">
            <Textarea
              placeholder="Type your message here..."
              className="min-h-[80px] resize-none border-none py-3 px-4 shadow-none focus-visible:ring-0 text-sm bg-background/50 rounded-xl"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            
            <Button
              onClick={handleSend}
              disabled={!message.trim()}
              size="icon"
              className="absolute bottom-3 right-3 h-9 w-9 rounded-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-xs text-center text-muted-foreground mt-2 flex items-center justify-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] border">Enter</kbd> to send • 
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] border">Shift+Enter</kbd> for new line
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
