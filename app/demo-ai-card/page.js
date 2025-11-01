"use client";

import { AIAssistantCard } from "@/components/ui/ai-assistant-card";
import { useState } from "react";

export default function DemoAICard() {
  const [selectedPrompt, setSelectedPrompt] = useState(null);

  const handlePromptClick = (prompt) => {
    console.log("Prompt clicked:", prompt);
    setSelectedPrompt(prompt);
  };

  const handleSendMessage = (message) => {
    console.log("Message sent:", message);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-black p-4">
      <AIAssistantCard 
        userName="Demo User" 
        onPromptClick={handlePromptClick}
        onSendMessage={handleSendMessage}
      />
      
      {selectedPrompt && (
        <div className="fixed bottom-4 right-4 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg">
          <p className="text-sm">Selected: <strong>{selectedPrompt}</strong></p>
        </div>
      )}
    </div>
  );
}
