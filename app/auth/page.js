"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatePresence, motion } from "framer-motion";

const Camera = dynamic(() => import("@/components/Camera"), { ssr: false });

export default function AuthPage() {
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState("password"); // "password" | "face"
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [faceEmbedding, setFaceEmbedding] = useState(null);
  const hasFace = Array.isArray(faceEmbedding) && faceEmbedding.length > 0;

  // Reset face embedding on mount
  useEffect(() => {
    setFaceEmbedding(null);
    setLoginError("");
  }, []);

  // Face attempts (lockout at 3). Reset on page load; logout clears as well.
  const [faceAttempts, setFaceAttempts] = useState(0);
  useEffect(() => {
    const stored = Number(window.localStorage.getItem("faceAttempts") || 0);
    if (Number.isFinite(stored)) setFaceAttempts(stored);
  }, []);
  function incFaceAttempts() {
    setFaceAttempts((n) => {
      const next = n + 1;
      window.localStorage.setItem("faceAttempts", String(next));
      return next;
    });
  }
  function resetFaceAttempts() {
    setFaceAttempts(0);
    window.localStorage.removeItem("faceAttempts");
  }

  

  async function handleLoginSubmit(event) {
    event.preventDefault();
    if (loading) return;
    setLoginError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    if (loginMethod === "password") {
      if (!email || !password) {
        setLoginError("Please enter email and password");
        return;
      }
    } else {
      if (faceAttempts >= 3) {
        setLoginError("Face attempts exceeded. Use password login.");
        return;
      }
      if (!Array.isArray(faceEmbedding) || faceEmbedding.length === 0) {
        setLoginError("Please capture your face before continuing");
        return;
      }
    }
    try {
      setLoading(true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: loginMethod === "password" ? password : "",
          embedding: loginMethod === "face" ? faceEmbedding : null,
          method: loginMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        let extra = "";
        if (typeof data?.similarity === "number" && typeof data?.cosTh === "number") {
          extra += ` (cos: ${data.similarity.toFixed(3)} < ${data.cosTh.toFixed(2)}`;
          if (typeof data?.distance === "number" && typeof data?.distTh === "number") {
            extra += ` | dist: ${data.distance.toFixed(3)} > ${data.distTh.toFixed(2)}`;
          }
          extra += ")";
        }
        setLoginError((data?.error || "Login failed") + extra);
        if (loginMethod === "face") incFaceAttempts();
        return;
      }
      // success - store session data
      resetFaceAttempts();
      
      // Store session ID and user data in localStorage
      if (data.sessionId) {
        localStorage.setItem("sessionId", data.sessionId);
        localStorage.setItem("userId", data.user.id);
        localStorage.setItem("userName", data.user.name);
        localStorage.setItem("userEmail", data.user.email);
        localStorage.setItem("loginTime", data.loginTime);
        console.log("Login successful. Session ID:", data.sessionId);
      }
      
      router.push("/card");
    } catch (err) {
      setLoginError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-zinc-50 dark:bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Sign in to your account
          </p>
        </div>
        
          <form onSubmit={handleLoginSubmit} className="space-y-4" autoComplete="off">
            <Tabs value={loginMethod} onValueChange={setLoginMethod} className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="password" className="flex-1">Password</TabsTrigger>
                <TabsTrigger value="face" className="flex-1">Face</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                name="email"
                placeholder="you@example.com"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-text outline-none transition placeholder:text-zinc-400 focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <AnimatePresence mode="wait" initial={false}>
              {loginMethod === "password" ? (
                <motion.div
                  key="password"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="space-y-1.5"
                >
                  <label htmlFor="login-password" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    required
                    name="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-text outline-none transition placeholder:text-zinc-400 focus:border-primary focus:ring-2 focus:ring-primary/30"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="face"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="space-y-1.5"
                >
                  <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Face verification</label>
                  <Camera autoCapture={false} onEmbedding={setFaceEmbedding} />
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">Click "Capture Face" then Sign in. Attempts: {faceAttempts}/3</p>
                  {hasFace && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800 inline-block dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-100">
                      Face detected
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {loginError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
                {loginError}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || (loginMethod === "face" ? (!hasFace || faceAttempts >= 3) : false)}
              aria-busy={loading}
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white"></span>
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </Button>

            <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
              Don’t have a CenTryx account? <a href="/register" className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-200">Register Here!</a>
            </p>

          </form>
        
      </div>
    </div>
  );
}


