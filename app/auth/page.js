"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const Camera = dynamic(() => import("@/components/Camera"), { ssr: false });

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [loginMethod, setLoginMethod] = useState("password"); // "password" | "face"
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [faceEmbedding, setFaceEmbedding] = useState(null);
  const [registerEmbeddings, setRegisterEmbeddings] = useState([]);
  const [registerCount, setRegisterCount] = useState(0);
  const REGISTER_TARGET = 3;
  const hasFace = Array.isArray(faceEmbedding) && faceEmbedding.length > 0;

  // Reset face embedding when switching modes to avoid stale embeddings
  useEffect(() => {
    setFaceEmbedding(null);
    setLoginError("");
  }, [mode]);

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

  useEffect(() => {
    if (!showSuccess) return;
    const timer = setTimeout(() => {
      setShowSuccess(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [showSuccess]);

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    if (loading) return;
    setRegisterError("");
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");
    if (!name || !email || !password) {
      setRegisterError("Please fill in all fields");
      return;
    }
    if (password !== confirm) {
      setRegisterError("Passwords do not match");
      return;
    }
    if (!Array.isArray(registerEmbeddings) || registerEmbeddings.length < REGISTER_TARGET) {
      setRegisterError(`Please capture ${REGISTER_TARGET} face samples (${registerEmbeddings.length}/${REGISTER_TARGET})`);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, embeddings: registerEmbeddings }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRegisterError(data?.error || "Registration failed");
        return;
      }
      setShowSuccess(true);
      setTimeout(() => setMode("login"), 1200);
      event.currentTarget.reset();
      setRegisterEmbeddings([]);
      setRegisterCount(0);
    } catch (err) {
      setRegisterError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
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
      {/* Success toast */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-900/30 dark:text-emerald-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-5 mt-0.5"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12m13.36-2.29a.75.75 0 1 0-1.22-.92l-3.18 4.22-1.56-1.56a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.13-.09z"
                clipRule="evenodd"
              />
            </svg>
            <div className="text-sm font-medium">Account Registered Successfully</div>
          </div>
        </div>
      )}

      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {mode === "login" ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>

        <div className="mb-6 flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition " +
              (mode === "login"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100")
            }
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition " +
              (mode === "register"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100")
            }
          >
            Register
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="flex rounded-md bg-zinc-100 p-1 dark:bg-zinc-800">
              <button type="button" onClick={() => setLoginMethod("password")} className={"flex-1 rounded px-3 py-1 text-sm " + (loginMethod === "password" ? "bg-white dark:bg-zinc-900" : "opacity-70")}>
                Password
              </button>
              <button type="button" onClick={() => setLoginMethod("face")} className={"flex-1 rounded px-3 py-1 text-sm " + (loginMethod === "face" ? "bg-white dark:bg-zinc-900" : "opacity-70")}>
                Face
              </button>
            </div>
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
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-300"
              />
            </div>
            {loginMethod === "password" && (
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                name="password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-300"
              />
            </div>
            )}
            {loginMethod === "face" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Face verification</label>
              <Camera autoCapture={false} onEmbedding={setFaceEmbedding} />
              <p className="text-xs text-zinc-600 dark:text-zinc-400">Click "Capture Face" then Sign in. Attempts: {faceAttempts}/3</p>
              {hasFace && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800 inline-block dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-100">
                  Face detected
                </div>
              )}
            </div>
            )}

            {loginError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="mt-2 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 focus:ring-2 focus:ring-zinc-900 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:focus:ring-zinc-300"
              disabled={loading || (loginMethod === "face" ? (!hasFace || faceAttempts >= 3) : false)}
            >
              Sign in
            </button>

            <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
              Don’t have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("register")}
                className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-200"
              >
                Create one
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="register-name" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Full name
              </label>
              <input
                id="register-name"
                type="text"
                required
                name="name"
                placeholder="Alex Johnson"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-300"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="register-email" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Email
              </label>
              <input
                id="register-email"
                type="email"
                required
                name="email"
                placeholder="you@example.com"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-300"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="register-password" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Password
              </label>
              <input
                id="register-password"
                type="password"
                required
                name="password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-300"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="register-confirm" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Confirm password
              </label>
              <input
                id="register-confirm"
                type="password"
                required
                name="confirm"
                placeholder="••••••••"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-300"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Face enrollment</label>
              <Camera
                autoCapture={false}
                onEmbedding={(desc) => {
                  setRegisterEmbeddings((prev) => {
                    if (prev.length >= REGISTER_TARGET) return prev;
                    const next = [...prev, desc];
                    setRegisterCount(next.length);
                    return next;
                  });
                }}
              />
              <p className="text-xs text-zinc-600 dark:text-zinc-400">Capture {REGISTER_TARGET} samples. We store embeddings, not photos.</p>
              {registerCount > 0 && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800 inline-block dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-100">
                  Samples: {registerCount}/{REGISTER_TARGET}
                </div>
              )}
            </div>

            {registerError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
                {registerError}
              </div>
            )}

            <button
              type="submit"
              className="mt-2 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 focus:ring-2 focus:ring-zinc-900 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:focus:ring-zinc-300"
              disabled={loading || registerCount < REGISTER_TARGET}
            >
              Create account
            </button>

            <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-200"
              >
                Log in
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}


