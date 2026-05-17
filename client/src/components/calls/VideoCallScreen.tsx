"use client";

/* eslint-disable @next/next/no-img-element */

import {
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  PhoneOff,
  Video,
  VideoOff,
  Volume2,
} from "lucide-react";

import { motion } from "framer-motion";
import { useState } from "react";

export default function VideoCallScreen() {
  const [minimized, setMinimized] =
    useState(false);

  const [micMuted, setMicMuted] =
    useState(false);

  const [cameraOff, setCameraOff] =
    useState(false);

  return (
    <motion.div
      initial={{
        opacity: 0,
        scale: 0.9,
      }}
      animate={{
        opacity: 1,
        scale: 1,
      }}
      className={`absolute z-[120] overflow-hidden border border-white/10 bg-black transition-all duration-300 ${
        minimized
          ? "bottom-6 right-6 h-[220px] w-[340px] rounded-[34px]"
          : "inset-0"
      }`}
    >
      {/* Remote */}
      <img
        src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1200"
        alt="Remote caller"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/40" />

      {/* Top */}
      <div className="absolute left-0 top-0 z-20 flex w-full items-center justify-between p-6">
        <div>
          <h2 className="text-3xl font-black">
            Mayuri
          </h2>

          <p className="mt-1 text-sm text-zinc-300">
            HD Video Call • Connected
          </p>
        </div>

        <button
          onClick={() =>
            setMinimized(!minimized)
          }
          className="rounded-2xl bg-black/40 p-4 backdrop-blur-xl"
        >
          {minimized ? (
            <Maximize2 size={18} />
          ) : (
            <Minimize2 size={18} />
          )}
        </button>
      </div>

      {/* Self Camera */}
      {!minimized && (
        <motion.div
          drag
          dragConstraints={{
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
          }}
          className="absolute right-6 top-28 z-30 overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-2xl"
        >
          <img
            src="https://i.pravatar.cc/500?img=12"
            alt="Self preview"
            className="h-[220px] w-[170px] object-cover"
          />
        </motion.div>
      )}

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 z-30 flex -translate-x-1/2 items-center gap-4">
        <button
          onClick={() =>
            setMicMuted(!micMuted)
          }
          className={`rounded-full p-5 ${
            micMuted
              ? "bg-red-500"
              : "bg-black/40"
          } backdrop-blur-xl`}
        >
          {micMuted ? (
            <MicOff size={24} />
          ) : (
            <Mic size={24} />
          )}
        </button>

        <button
          onClick={() =>
            setCameraOff(!cameraOff)
          }
          className={`rounded-full p-5 ${
            cameraOff
              ? "bg-red-500"
              : "bg-black/40"
          } backdrop-blur-xl`}
        >
          {cameraOff ? (
            <VideoOff size={24} />
          ) : (
            <Video size={24} />
          )}
        </button>

        <button className="rounded-full bg-black/40 p-5 backdrop-blur-xl">
          <Volume2 size={24} />
        </button>

        <button className="rounded-full bg-red-500 p-6 shadow-2xl shadow-red-500/40">
          <PhoneOff size={26} />
        </button>
      </div>

      {/* Waveform */}
      {!minimized && (
        <div className="absolute bottom-32 left-1/2 flex -translate-x-1/2 gap-2">
          {[1, 2, 3, 4, 5].map((bar) => (
            <motion.div
              key={bar}
              animate={{
                height: [
                  20,
                  60,
                  30,
                  70,
                  20,
                ],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: bar * 0.1,
              }}
              className="w-2 rounded-full bg-white"
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
