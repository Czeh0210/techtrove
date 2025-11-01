"use client";

import Navigation from "@/components/Navigation";

export default function ChatbotPage() {
  return (
    <div className="min-h-screen w-full bg-zinc-50 dark:bg-black flex items-center justify-center px-4 pb-32 sm:pt-32 sm:pb-8">
      <Navigation />
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mb-4">Chatbot</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">Chat interface coming soon...</p>
      </div>
    </div>
  );
}
