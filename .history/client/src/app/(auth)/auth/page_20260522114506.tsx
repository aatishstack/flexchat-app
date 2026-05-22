"use client";

import { motion } from "framer-motion";

import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  MessageCircle,
  RadioTower,
  ShieldCheck,
  Video,
} from "lucide-react";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import axios from "axios";

import { FirebaseError } from "firebase/app";

import { signInWithRedirect } from "firebase/auth";

import { useSocketStore } from "@/store/socket-store";
import { useToastStore } from "@/store/toast-store";

import { useAuth } from "@/hooks/useAuth";

import { useAuthStore } from "@/stores/auth.store";

import { getFirebaseAuth, getGoogleProvider } from "@/lib/firebase";

import { tokenStorage } from "@/lib/token";

import { login, register } from "@/services/auth.service";

import AuthBackground from "@/components/auth/auth-background";

import PremiumInput from "@/components/ui/premium-input";

import PremiumButton from "@/components/ui/premium-button";

export default function AuthPage() {
  const router = useRouter();

  const { connectSocket } = useSocketStore();

  const { isAuthenticated, isHydrated } = useAuth();

  const setAuth = useAuthStore((state) => state.setAuth);

  const pushToast = useToastStore((state) => state.pushToast);

  const [isLogin, setIsLogin] = useState(true);

  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [username, setUsername] = useState("");

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [loading, setLoading] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!isHydrated) return;

    if (isAuthenticated) {
      router.replace("/chat");
    }
  }, [isAuthenticated, isHydrated, router]);

  async function handleAuthSuccess() {
    if (loading || googleLoading) {
      return;
    }

    if (!isLogin && !acceptedTerms) {
      setError("Please accept the terms to create your account.");

      return;
    }

    try {
      setLoading(true);

      setError("");

      const response = isLogin
        ? await login({
            email,
            password,
          })
        : await register({
            username,
            email,
            password,
          });

      tokenStorage.set(response.token);

      setAuth({
        user: response.user,
        token: response.token,
      });

      connectSocket(response.token);

      router.push("/chat");
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message || "Authentication failed");
      } else {
        setError("Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    if (loading || googleLoading) {
      return;
    }

    try {
      setGoogleLoading(true);

      setError("");

      await signInWithRedirect(getFirebaseAuth(), getGoogleProvider());

      return;
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message
        : error instanceof FirebaseError
          ? error.message
          : "Please try again in a moment.";

      pushToast({
        title: "Google sign-in failed",
        message,
        variant: "error",
      });
    } finally {
      setGoogleLoading(false);
    }
  }

  const canSubmit = Boolean(
    email.trim() &&
    password.trim() &&
    (isLogin || (username.trim() && acceptedTerms)),
  );

  const featureItems = [
    {
      icon: RadioTower,
      title: "Realtime Sync",
      detail: "Live delivery, typing, and presence across devices.",
    },
    {
      icon: Video,
      title: "Voice and Video",
      detail: "WebRTC calls with production STUN/TURN support.",
    },
    {
      icon: ShieldCheck,
      title: "Secure Sessions",
      detail: "Persistent JWT auth with reconnect recovery.",
    },
  ];

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07070a] text-white">
        <div className="flex flex-col items-center gap-5">
          <div className="h-14 w-14 animate-spin rounded-2xl border border-purple-500/30 border-t-purple-400" />

          <div className="text-center">
            <h2 className="text-lg font-semibold">Loading FlexChat</h2>

            <p className="mt-1 text-sm text-zinc-500">
              Preparing secure session...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="modal-safe-scroll relative h-svh min-h-svh touch-pan-y overflow-y-auto overflow-x-hidden overscroll-y-contain bg-[#050510] text-white">
      <AuthBackground />

      {/* Rest of your UI remains SAME */}
    </main>
  );
}
