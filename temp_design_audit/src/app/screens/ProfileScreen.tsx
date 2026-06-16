import { useNavigate } from "react-router";
import { ArrowLeft, MoreVertical, MessageCircle, Phone, Video } from "lucide-react";
import { StatusBar, HomeIndicator } from "../components/shared";

export function ProfileScreen() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-full bg-[#0C0C10]">
      <StatusBar />
      <div className="flex items-center px-3 py-2">
        <button onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft size={21} className="text-white/65" />
        </button>
        <h2 className="flex-1 text-center text-[16px] font-bold text-white">Profile</h2>
        <button className="p-2">
          <MoreVertical size={21} className="text-white/55" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        <div className="flex flex-col items-center px-5 pt-4 pb-6">
          <div
            className="w-[90px] h-[90px] rounded-full flex items-center justify-center text-[32px] font-black text-white mb-3"
            style={{ background: "#C8376A", boxShadow: "0 0 0 4px rgba(124,79,240,0.25), 0 0 0 8px rgba(124,79,240,0.08)" }}
          >
            AN
          </div>
          <h2 className="text-[22px] font-extrabold text-white">Aisha Nwosu</h2>
          <p className="text-[13px] text-white/42 mt-1 font-medium">Building products that matter ✦</p>
          <div className="flex items-center gap-1.5 mt-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[12px] text-emerald-400 font-semibold">Online now</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex mx-5 mb-5 rounded-2xl overflow-hidden divide-x divide-white/[0.06]" style={{ background: "rgba(255,255,255,0.04)" }}>
          {[{ label: "Mutual", value: "12" }, { label: "Groups", value: "4" }, { label: "Media", value: "63" }].map(({ label, value }) => (
            <div key={label} className="flex-1 flex flex-col items-center py-4">
              <span className="text-[20px] font-extrabold text-white">{value}</span>
              <span className="text-[11px] text-white/32 font-semibold mt-0.5">{label}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mx-5 mb-6">
          {[
            { icon: MessageCircle, label: "Message", fn: () => navigate("/conversation") },
            { icon: Phone,         label: "Call",    fn: () => navigate("/incoming-call") },
            { icon: Video,         label: "Video",   fn: () => navigate("/video-call") },
          ].map(({ icon: Icon, label, fn }) => (
            <button
              key={label}
              onClick={fn}
              className="flex-1 flex flex-col items-center gap-2 py-3.5 rounded-2xl hover:bg-white/[0.07] transition-colors"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <Icon size={19} style={{ color: "#7C4FF0" }} />
              <span className="text-[11.5px] text-white/55 font-semibold">{label}</span>
            </button>
          ))}
        </div>

        {/* Info rows */}
        <div className="mx-5 rounded-2xl overflow-hidden mb-5" style={{ background: "rgba(255,255,255,0.04)" }}>
          {[
            { label: "Phone",        value: "+44 7911 123456"  },
            { label: "Username",     value: "@aishanwosu"      },
            { label: "Member since", value: "January 2024"     },
          ].map(({ label, value }, i) => (
            <div key={label} className={`flex items-center justify-between px-4 py-3.5 ${i > 0 ? "border-t border-white/[0.05]" : ""}`}>
              <span className="text-[12.5px] text-white/38 font-semibold">{label}</span>
              <span className="text-[13.5px] text-white font-medium">{value}</span>
            </div>
          ))}
        </div>

        {/* Media grid */}
        <div className="mx-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13.5px] font-bold text-white">Shared Media</span>
            <button className="text-[12.5px] font-semibold" style={{ color: "#7C4FF0" }}>See all</button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {["#7C4FF0", "#C8376A", "#2563EB", "#059669", "#D97706", "#7C3AED"].map((col, i) => (
              <div key={i} className="aspect-square rounded-xl" style={{ background: col, opacity: 0.65 + i * 0.05 }} />
            ))}
          </div>
        </div>
      </div>
      <HomeIndicator />
    </div>
  );
}
