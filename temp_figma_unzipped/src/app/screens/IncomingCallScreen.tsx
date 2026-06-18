import { useNavigate } from "react-router";
import { PhoneOff, Phone, Bell, MessageCircle } from "lucide-react";
import { StatusBar, HomeIndicator } from "../components/shared";

export function IncomingCallScreen() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-full" style={{ background: "#08060F" }}>
      <StatusBar light />
      <div className="flex flex-col items-center flex-1 pt-14">
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/35 mb-10">
          Incoming call
        </p>
        <div className="relative flex items-center justify-center mb-7">
          <div className="absolute rounded-full animate-ping" style={{ width: 148, height: 148, background: "rgba(124,79,240,0.07)" }} />
          <div className="absolute rounded-full" style={{ width: 126, height: 126, background: "rgba(124,79,240,0.12)" }} />
          <div className="absolute rounded-full" style={{ width: 108, height: 108, background: "rgba(124,79,240,0.18)" }} />
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-[30px] font-black text-white relative z-10"
            style={{ background: "#C8376A", boxShadow: "0 0 0 3px rgba(124,79,240,0.5)" }}
          >
            AN
          </div>
        </div>
        <h2 className="text-[28px] font-extrabold text-white mb-1.5">Aisha Nwosu</h2>
        <p className="text-[13.5px] text-white/38 font-medium">FlexChat Audio Call</p>

        <div className="flex flex-col items-center gap-2.5 mt-9">
          <button className="flex items-center gap-2 rounded-full px-5 py-2.5" style={{ background: "rgba(255,255,255,0.07)" }}>
            <Bell size={14} className="text-white/45" />
            <span className="text-[12.5px] font-semibold text-white/45">Remind me</span>
          </button>
          <button className="flex items-center gap-2 rounded-full px-5 py-2.5" style={{ background: "rgba(255,255,255,0.07)" }}>
            <MessageCircle size={14} className="text-white/45" />
            <span className="text-[12.5px] font-semibold text-white/45">Send message</span>
          </button>
        </div>
      </div>

      <div className="flex items-end justify-center gap-16 pb-14">
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "#EF4444", boxShadow: "0 0 20px rgba(239,68,68,0.3)" }}
          >
            <PhoneOff size={26} className="text-white" />
          </button>
          <span className="text-[11.5px] font-semibold text-white/35">Decline</span>
        </div>
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => navigate("/video-call")}
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "#22C55E", boxShadow: "0 0 20px rgba(34,197,94,0.3)" }}
          >
            <Phone size={26} className="text-white" />
          </button>
          <span className="text-[11.5px] font-semibold text-white/35">Accept</span>
        </div>
      </div>
      <HomeIndicator />
    </div>
  );
}
