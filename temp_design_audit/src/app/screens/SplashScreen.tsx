import { useNavigate } from "react-router";
import { FlexLogo } from "../components/shared";

export function SplashScreen() {
  const navigate = useNavigate();
  return (
    <div
      className="flex flex-col items-center justify-center h-full bg-[#0C0C10] cursor-pointer select-none"
      onClick={() => navigate("/onboarding")}
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <div className="absolute inset-0 rounded-[22px] blur-2xl opacity-40" style={{ background: "#7C4FF0", transform: "scale(1.4)" }} />
          <FlexLogo size={76} className="relative z-10" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-[32px] font-extrabold tracking-tight text-white">FlexChat</h1>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-white/35">Message your way</p>
        </div>
        <div className="flex gap-2 mt-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.5 rounded-full bg-[#7C4FF0]"
              style={{ width: i === 1 ? 24 : 8, opacity: i === 1 ? 1 : 0.25 }}
            />
          ))}
        </div>
      </div>
      <p className="absolute bottom-14 text-[11px] font-medium tracking-widest uppercase text-white/20">
        Tap to continue
      </p>
    </div>
  );
}
