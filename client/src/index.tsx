"use client";

import {
  MessageCircle,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";

import { motion } from "framer-motion";

import {
  useRouter,
} from "next/navigation";

import {
  useState,
} from "react";

import axios from "axios";

import Cookies from "js-cookie";

export default function AuthPage() {

  const router =
    useRouter();

  const [isLogin, setIsLogin] =
    useState(true);

  const [username, setUsername] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleAuth =
    async () => {

      try {

        setLoading(true);

        if (isLogin) {

          const res =
            await axios.post(
              "http://localhost:5000/login",
              {
                email,
                password,
              }
            );

          Cookies.set(
            "flexchat_token",
            res.data.token,
            {
              expires: 7,
            }
          );

          localStorage.setItem(
            "flexchat_user",
            JSON.stringify(
              res.data.user
            )
          );

          router.push(
            "/chat"
          );

        } else {

          await axios.post(
            "http://localhost:5000/register",
            {
              username,
              email,
              password,
            }
          );

          alert(
            "Account created"
          );

          setIsLogin(true);
        }

      } catch (err) {

        console.error(err);

        alert(
          "Authentication failed"
        );

      } finally {

        setLoading(false);
      }
    };

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[#050816] text-white">

      <div className="absolute inset-0 overflow-hidden">

        <motion.div
          animate={{
            x: [0, 80, 0],
            y: [0, -40, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
          }}
          className="absolute left-[-120px] top-[-120px] h-[420px] w-[420px] rounded-full bg-purple-500/20 blur-[120px]"
        />

        <motion.div
          animate={{
            x: [0, -60, 0],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
          }}
          className="absolute bottom-[-120px] right-[-120px] h-[420px] w-[420px] rounded-full bg-cyan-500/20 blur-[120px]"
        />

        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

      </div>

      <div className="relative z-10 hidden flex-1 flex-col justify-between border-r border-white/10 p-10 lg:flex">

        <div className="flex items-center gap-4">

          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-600 to-blue-500 shadow-[0_10px_40px_rgba(139,92,246,0.35)]">

            <MessageCircle className="h-7 w-7" />

          </div>

          <div>

            <h1 className="text-3xl font-black">
              FlexChat
            </h1>

            <p className="text-sm text-white/40">
              Premium Realtime Messenger
            </p>

          </div>

        </div>

        <div className="max-w-xl">

          <motion.h2
            initial={{
              opacity: 0,
              y: 30,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.6,
            }}
            className="text-6xl font-black leading-[1.05]"
          >

            Messaging

            <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">

              {" "}
              Reimagined

            </span>

          </motion.h2>

          <motion.p
            initial={{
              opacity: 0,
              y: 30,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.1,
              duration: 0.6,
            }}
            className="mt-8 text-xl leading-relaxed text-white/55"
          >

            Experience ultra smooth realtime messaging,
            voice calls, modern privacy controls and
            futuristic UI crafted for next generation
            communication.

          </motion.p>

          <div className="mt-12 space-y-5">

            {[
              "Realtime encrypted messaging",
              "Ultra smooth APK experience",
              "Telegram-inspired performance",
              "Modern privacy controls",
            ].map((item, index) => (

              <motion.div
                key={index}
                initial={{
                  opacity: 0,
                  x: -20,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                transition={{
                  delay: index * 0.1,
                }}
                className="flex items-center gap-4"
              >

                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.05]">

                  <ShieldCheck className="h-5 w-5 text-cyan-300" />

                </div>

                <span className="text-white/70">
                  {item}
                </span>

              </motion.div>
            ))}

          </div>

        </div>

        <div className="flex items-center gap-3 text-sm text-white/35">

          <Sparkles className="h-4 w-4" />

          Built for premium realtime communication

        </div>

      </div>

      <div className="relative z-10 flex w-full items-center justify-center p-6 lg:w-[620px]">

        <motion.div
          initial={{
            opacity: 0,
            y: 40,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.6,
          }}
          className="w-full max-w-md rounded-[40px] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-3xl"
        >

          <div>

            <h2 className="text-4xl font-black">

              {isLogin
                ? "Welcome Back"
                : "Create Account"}

            </h2>

            <p className="mt-3 text-white/45">

              {isLogin
                ? "Sign in to continue your realtime conversations."
                : "Start your premium messaging journey."}

            </p>

          </div>

          <div className="mt-10 space-y-5">

            {!isLogin && (

              <div>

                <label className="mb-3 block text-sm text-white/45">
                  Username
                </label>

                <input
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      e.target.value
                    )
                  }
                  type="text"
                  placeholder="Mayuri"
                  className="w-full rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-5 outline-none"
                />

              </div>
            )}

            <div>

              <label className="mb-3 block text-sm text-white/45">
                Email Address
              </label>

              <input
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                type="email"
                placeholder="mayuri@example.com"
                className="w-full rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-5 outline-none"
              />

            </div>

            <div>

              <label className="mb-3 block text-sm text-white/45">
                Password
              </label>

              <input
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                type="password"
                placeholder="••••••••"
                className="w-full rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-5 outline-none"
              />

            </div>

            <motion.button
              whileHover={{
                scale: 1.02,
              }}
              whileTap={{
                scale: 0.98,
              }}
              onClick={handleAuth}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-purple-600 to-blue-500 py-5 text-lg font-bold"
            >

              {loading
                ? "Please wait..."
                : isLogin
                ? "Continue"
                : "Create Account"}

              <ArrowRight className="h-5 w-5" />

            </motion.button>

            <div className="pt-4 text-center text-sm text-white/45">

              {isLogin
                ? "Don't have an account?"
                : "Already have account?"}

              <button
                onClick={() =>
                  setIsLogin(
                    !isLogin
                  )
                }
                className="ml-2 font-semibold text-purple-300"
              >

                {isLogin
                  ? "Create one"
                  : "Login"}

              </button>

            </div>

          </div>

        </motion.div>

      </div>

    </main>
  );
}