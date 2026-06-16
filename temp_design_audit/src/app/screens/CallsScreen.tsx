import { useState } from "react";
import { useNavigate } from "react-router";
import { Plus, Phone, PhoneMissed } from "lucide-react";
import { StatusBar, Avatar, BottomNav, HomeIndicator } from "../components/shared";
import { CALLS, CallType } from "../data";

export function CallsScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"All" | "Missed">("All");
  const shown = tab === "Missed" ? CALLS.filter((c) => c.type === "missed") : CALLS;

  const typeColor = (t: CallType) =>
    t === "incoming" ? "#34D399" : t === "outgoing" ? "#7C4FF0" : "#F87171";
  const typeLabel = (t: CallType) =>
    t === "incoming" ? "Incoming" : t === "outgoing" ? "Outgoing" : "Missed";

  return (
    <div className="flex flex-col h-full bg-[#0C0C10]">
      <StatusBar />
      <div className="flex items-center justify-between px-5 pt-2 pb-3">
        <h1 className="text-[22px] font-extrabold text-white">Calls</h1>
        <button
          onClick={() => navigate("/incoming-call")}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06]"
        >
          <Plus size={18} className="text-white/60" />
        </button>
      </div>

      <div className="flex gap-1 mx-5 mb-4 p-1 rounded-xl bg-white/[0.05]">
        {(["All", "Missed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-[13px] font-bold transition-colors"
            style={{ background: tab === t ? "#7C4FF0" : "transparent", color: tab === t ? "white" : "rgba(255,255,255,0.38)" }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {shown.map((call) => (
          <div key={call.id} className="flex items-center gap-3.5 px-5 py-3">
            <Avatar initials={call.initials} color={call.color} size={46} />
            <div className="flex-1 min-w-0">
              <div className="text-[14.5px] font-semibold text-white mb-0.5">{call.name}</div>
              <div className="flex items-center gap-1.5">
                {call.type === "missed"
                  ? <PhoneMissed size={13} style={{ color: typeColor(call.type) }} />
                  : <Phone size={13} style={{ color: typeColor(call.type) }} />
                }
                <span className="text-[12px] font-semibold" style={{ color: typeColor(call.type) }}>
                  {typeLabel(call.type)}
                </span>
                <span className="text-white/20 text-[11px]">·</span>
                <span className="text-[12px] text-white/32 font-medium">{call.time}</span>
              </div>
              {call.duration && (
                <span className="text-[11px] text-white/22 mt-0.5 block">{call.duration}</span>
              )}
            </div>
            <button
              onClick={() => navigate("/incoming-call")}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.05]"
            >
              <Phone size={17} style={{ color: "#7C4FF0" }} />
            </button>
          </div>
        ))}
      </div>

      <BottomNav />
      <HomeIndicator />
    </div>
  );
}
