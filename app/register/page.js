"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";

const Camera = dynamic(() => import("@/components/Camera"), { ssr: false });

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registerEmbeddings, setRegisterEmbeddings] = useState([]);
  const [registerCount, setRegisterCount] = useState(0);
  const REGISTER_TARGET = 3;

  useEffect(() => {
    setError("");
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    setError("");
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");
    if (!name || !email || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (!Array.isArray(registerEmbeddings) || registerEmbeddings.length < REGISTER_TARGET) {
      setError(`Please capture ${REGISTER_TARGET} face samples (${registerEmbeddings.length}/${REGISTER_TARGET})`);
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
        setError(data?.error || "Registration failed");
        return;
      }
      router.push("/auth");
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-zinc-50 dark:bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Create account</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Capture {REGISTER_TARGET} face samples. We store embeddings, not photos.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="register-name" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Full name</label>
            <input id="register-name" type="text" required name="name" placeholder="Alex Johnson" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-text outline-none transition placeholder:text-zinc-400 focus:border-primary focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="register-email" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Email</label>
            <input id="register-email" type="email" required name="email" placeholder="you@example.com" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-text outline-none transition placeholder:text-zinc-400 focus:border-primary focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="register-password" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Password</label>
            <input id="register-password" type="password" required name="password" placeholder="••••••••" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-text outline-none transition placeholder:text-zinc-400 focus:border-primary focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="register-confirm" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Confirm password</label>
            <input id="register-confirm" type="password" required name="confirm" placeholder="••••••••" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-text outline-none transition placeholder:text-zinc-400 focus:border-primary focus:ring-2 focus:ring-primary/30" />
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
            {registerCount > 0 && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800 inline-block dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-100">
                Samples: {registerCount}/{REGISTER_TARGET}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading || registerCount < REGISTER_TARGET} aria-busy={loading}>
            {loading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white"></span>
                Creating account...
              </span>
            ) : (
              "Create account"
            )}
          </Button>
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            Already have an account? <a href="/auth" className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-200">Sign in</a>
          </p>
        </form>
      </div>
    </div>
  );
}


