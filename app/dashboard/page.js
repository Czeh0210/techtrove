"use client";

import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  function handleLogout() {
    // No session yet; just redirect to landing
    try { window.localStorage.removeItem("faceAttempts"); } catch {}
    router.push("/");
  }

  return (
    <div className="min-h-screen w-full bg-zinc-50 dark:bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mb-4">Dashboard</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">You are logged in.</p>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Log out
        </button>
      </div>
    </div>
  );
}


