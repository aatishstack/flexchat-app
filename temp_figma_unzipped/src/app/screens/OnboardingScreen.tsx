import { useState } from "react";
import { useNavigate } from "react-router";
import { StatusBar } from "../components/shared";

export function OnboardingScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const slides = [
    {
      art: (
        <svg width="220" height="176" viewBox="0 0 220 176" fill="none">
          <rect x="16" y="50" width="120" height="52" rx="26" fill="#7C4FF0" />
          <rect x="84" y="18" width="100" height="42" rx="21" fill="#1E1E27" />
          <rect x="16" y="116" width="88" height="38" rx="19" fill="#1E1E27" />
          <circle cx="44" cy="76" r="5" fill="white" opacity="0.55" />
          <circle cx="60" cy="76" r="5" fill="white" opacity="0.85" />
          <circle cx="76" cy="76" r="5" fill="white" opacity="0.55" />
          <circle cx="107" cy="39" r="3.5" fill="#7C4FF0" opacity="0.6" />
          <circle cx="124" cy="39" r="3.5" fill="#7C4FF0" opacity="0.9" />
          <circle cx="141" cy="39" r="3.5" fill="#7C4FF0" opacity="0.6" />
          <circle cx="186" cy="108" r="16" fill="#7C4FF0" opacity="0.15" />
          <circle cx="186" cy="108" r="8"  fill="#7C4FF0" opacity="0.4" />
        </svg>
      ),
      title: "Talk freely.",
      sub: "Messages that feel instant. Conversations that feel real.",
    },
    {
      art: (
        <svg width="220" height="176" viewBox="0 0 220 176" fill="none">
          <circle cx="110" cy="82" r="58" fill="#1A1A22" />
          <circle cx="110" cy="82" r="44" fill="#7C4FF0" opacity="0.1" />
          <circle cx="110" cy="82" r="30" fill="#7C4FF0" opacity="0.2" />
          <circle cx="110" cy="82" r="18" fill="#7C4FF0" />
          <path d="M104 77q1-4 6-4t6 4v4l-3 2-1-1q-2 2-4 3l-1-1-2 3h-1q-4 0-4-4v-4q0-2 4-2z" fill="white" opacity="0.95" />
          <path d="M80 48 Q110 34 140 48" stroke="#7C4FF0" strokeWidth="2" fill="none" opacity="0.35" strokeLinecap="round" />
          <path d="M68 38 Q110 20 152 38" stroke="#7C4FF0" strokeWidth="1.5" fill="none" opacity="0.18" strokeLinecap="round" />
          <circle cx="40"  cy="100" r="6" fill="#1E1E27" />
          <circle cx="180" cy="60"  r="5" fill="#1E1E27" />
        </svg>
      ),
      title: "Crystal clear calls.",
      sub: "HD voice and video. No dropouts, no compromise.",
    },
    {
      art: (
        <svg width="220" height="176" viewBox="0 0 220 176" fill="none">
          <rect x="70" y="28" width="80" height="96" rx="20" fill="#1A1A22" />
          <rect x="82" y="52" width="56" height="60" rx="12" fill="#7C4FF0" opacity="0.15" />
          <rect x="92" y="76" width="36" height="28" rx="7" fill="#7C4FF0" />
          <path d="M98 76V68a12 12 0 0124 0v8" stroke="#7C4FF0" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <circle cx="110" cy="89" r="4" fill="white" />
          <line x1="110" y1="93" x2="110" y2="99" stroke="white" strokeWidth="3" strokeLinecap="round" />
          <circle cx="54"  cy="56"  r="4"   fill="#7C4FF0" opacity="0.4" />
          <circle cx="166" cy="80"  r="5.5" fill="#7C4FF0" opacity="0.25" />
          <circle cx="60"  cy="130" r="3"   fill="#7C4FF0" opacity="0.35" />
          <circle cx="168" cy="136" r="4"   fill="#7C4FF0" opacity="0.2" />
        </svg>
      ),
      title: "Yours alone.",
      sub: "End-to-end encrypted. Every message, every call. Always.",
    },
  ];

  const isLast = step === slides.length - 1;
  const { art, title, sub } = slides[step];

  return (
    <div className="flex flex-col h-full bg-[#0C0C10] px-6">
      <StatusBar />
      <div className="flex justify-end pt-2 pb-2">
        {!isLast && (
          <button onClick={() => navigate("/chats")} className="text-xs font-semibold text-white/35 px-2 py-1">
            Skip
          </button>
        )}
      </div>
      <div className="flex justify-center items-center" style={{ height: 196 }}>
        {art}
      </div>
      <div className="flex flex-col gap-3 mt-8">
        <h1 className="text-[38px] font-extrabold text-white tracking-tight leading-none">{title}</h1>
        <p className="text-[15px] text-white/45 leading-relaxed font-medium">{sub}</p>
      </div>
      <div className="flex gap-2 mt-8">
        {slides.map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{ width: i === step ? 26 : 8, background: i === step ? "#7C4FF0" : "rgba(255,255,255,0.14)" }}
          />
        ))}
      </div>
      <div className="mt-8 mb-6">
        <button
          onClick={() => (isLast ? navigate("/chats") : setStep(step + 1))}
          className="w-full py-4 rounded-2xl font-bold text-white text-[15px]"
          style={{ background: "#7C4FF0" }}
        >
          {isLast ? "Get Started" : "Continue"}
        </button>
      </div>
    </div>
  );
}
