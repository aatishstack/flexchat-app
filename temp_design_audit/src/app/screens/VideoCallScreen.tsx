import { useState } from "react";
import { useNavigate } from "react-router";
import { PhoneOff, MicOff, Mic, VideoOff, Video, Volume2, RotateCcw } from "lucide-react";
import { StatusBar, HomeIndicator } from "../components/shared";

export function VideoCallScreen() {
  const navigate = useNavigate();
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  return (
    <div className="flex flex-col h-full relative overflow-hidden" style={{ background: "#0A0614" }}>
      {/* Ambient */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 60% at 30% 40%, #1B0B38 0%, #0A0614 65%)" }}
      />

      {/* Remote avatar placeholder (since no real video) */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center text-[38px] font-black text-white"
          style={{ background: "#C8376A" }}
        >
          AN
        </div>
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <StatusBar light />
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <div className="w-10" />
          <div className="flex flex-col items-center">
            <span className="text-[14px] font-bold text-white">Aisha Nwosu</span>
            <span className="text-[11px] text-white/55 font-medium mt-0.5">12:04</span>
          </div>
          <button className="w-10 h-10 flex items-center justify-end">
            <Volume2 size={20} className="text-white" />
          </button>
        </div>

        <div className="flex-1 relative">
          {/* Self view pip */}
          <div className="absolute top-4 right-4 w-[100px] h-[150px] rounded-2xl overflow-hidden bg-[#1E1E27] shadow-xl border border-white/10">
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-white/30 text-[10px] font-bold">You</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 pb-12 pt-6 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-between max-w-[280px] mx-auto">
            <button
              onClick={() => setCamOff(!camOff)}
              className="w-[52px] h-[52px] rounded-full flex items-center justify-center backdrop-blur-md transition-colors"
              style={{ background: camOff ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.15)" }}
            >
              {camOff ? <VideoOff size={22} color="#000" /> : <Video size={22} className="text-white" />}
            </button>
            <button
              onClick={() => setMuted(!muted)}
              className="w-[52px] h-[52px] rounded-full flex items-center justify-center backdrop-blur-md transition-colors"
              style={{ background: muted ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.15)" }}
            >
              {muted ? <MicOff size={22} color="#000" /> : <Mic size={22} className="text-white" />}
            </button>
            <button
              className="w-[52px] h-[52px] rounded-full flex items-center justify-center backdrop-blur-md bg-white/15"
            >
              <RotateCcw size={22} className="text-white" />
            </button>
            <button
              onClick={() => navigate(-1)}
              className="w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.3)]"
              style={{ background: "#EF4444" }}
            >
              <PhoneOff size={22} className="text-white" />
            </button>
          </div>
        </div>
        <HomeIndicator />
      </div>
    </div>
  );
}
