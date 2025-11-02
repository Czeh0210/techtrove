"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

const Camera = dynamic(() => import("@/components/Camera"), { ssr: false });

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registerEmbeddings, setRegisterEmbeddings] = useState([]);
  const [registerCount, setRegisterCount] = useState(0);
  const REGISTER_TARGET = 3;
  const [actionDialog, setActionDialog] = useState({ open: false, status: 'loading', message: '', title: '' });

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
      
      // Show loading dialog
      setActionDialog({
        open: true,
        status: 'loading',
        title: 'Creating Account',
        message: 'Please wait while we set up your account...'
      });
      
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, embeddings: registerEmbeddings }),
      });
      const data = await res.json();
      
      // Minimum 2 second loading display
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (!res.ok) {
        // Show error dialog
        setActionDialog({
          open: true,
          status: 'error',
          title: 'Registration Failed',
          message: data?.error || "Failed to create account. Please try again."
        });
        return;
      }
      
      // Show success dialog
      setActionDialog({
        open: true,
        status: 'success',
        title: 'Account Created Successfully!',
        message: 'Your account has been created. Redirecting to login...'
      });
      
      // Redirect after showing success
      setTimeout(() => {
        router.push("/auth");
      }, 2000);
    } catch (e) {
      // Minimum 2 second loading display
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Show error dialog
      setActionDialog({
        open: true,
        status: 'error',
        title: 'Network Error',
        message: "Unable to connect to the server. Please check your connection and try again."
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 relative overflow-hidden">
      {/* Enhanced Gradient Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"></div>
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-violet-400/20 to-purple-400/20 rounded-full blur-3xl animate-aurora-1"></div>
        <div className="absolute top-1/4 right-0 w-[700px] h-[700px] bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-aurora-2"></div>
        <div className="absolute bottom-0 left-1/3 w-[650px] h-[650px] bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl animate-aurora-3"></div>
        <div className="absolute top-1/2 right-1/4 w-[550px] h-[550px] bg-gradient-to-br from-pink-400/20 to-rose-400/20 rounded-full blur-3xl animate-aurora-4"></div>
      </div>
      
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border-gray-200">
        {/* Brand Header */}
        <Link href="/" className="flex items-center justify-center gap-3 px-6 pt-6 pb-4 border-b border-gray-100 hover:bg-gray-50/50 transition-colors cursor-pointer group">
          <div className="relative w-10 h-10 flex-shrink-0">
            <Image 
              src="/Centryx.svg" 
              alt="CenTryx Logo" 
              width={40} 
              height={40}
              className="group-hover:scale-110 transition-transform duration-200"
            />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:to-indigo-700 transition-all">
            CenTryx
          </h1>
        </Link>

        <CardContent className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Create account</h2>
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
        </CardContent>
      </Card>

      {/* Action Loading/Success/Error Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ ...actionDialog, open: false })}>
        <DialogContent className="sm:max-w-md" showCloseButton={actionDialog.status !== 'loading'}>
          <DialogHeader>
            <DialogTitle className="sr-only">{actionDialog.title}</DialogTitle>
          </DialogHeader>
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
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
              </motion.div>
            )}

            {/* Error State */}
            {actionDialog.status === 'error' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
  );
}


