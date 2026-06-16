import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Phone, Video, MoreVertical, Plus, Smile, Send, Mic, CheckCheck } from "lucide-react";
import { StatusBar, Avatar, HomeIndicator } from "../components/shared";
import { CHATS, MESSAGES } from "../data";

export function ConversationScreen() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const c = CHATS[0];

  return (
    <div className="flex flex-col h-full bg-[#0C0C10]">
      <StatusBar />
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.05]">
        <button onClick={() => navigate(-1)} className="p-1.5">
          <ArrowLeft size={22} className="text-white/65" />
        </button>
        <button onClick={() => navigate("/profile")} className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar initials={c.initials} color={c.color} size={36} online={c.online} />
          <div className="flex-1 min-w-0 text-left">
            <div className="text-[14.5px] font-bold text-white leading-tight">{c.name}</div>
            <div className="text-[11px] font-semibold text-emerald-400">online</div>
          </div>
        </button>
        <div className="flex items-center">
          <button onClick={() => navigate("/incoming-call")} className="w-9 h-9 flex items-center justify-center">
            <Phone size={18} className="text-white/55" />
          </button>
          <button onClick={() => navigate("/video-call")} className="w-9 h-9 flex items-center justify-center">
            <Video size={20} className="text-white/55" />
          </button>
          <button className="w-9 h-9 flex items-center justify-center">
            <MoreVertical size={20} className="text-white/55" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1.5" style={{ scrollbarWidth: "none" }}>
        <div className="flex justify-center mb-3">
          <span className="text-[11px] text-white/28 font-semibold bg-white/[0.05] px-3 py-1 rounded-full">Today</span>
        </div>
        {MESSAGES.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sent ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[74%] px-4 py-2.5"
              style={{
                background: msg.sent ? "#7C4FF0" : "#1C1C24",
                borderRadius: msg.sent ? "18px 18px 5px 18px" : "18px 18px 18px 5px",
              }}
            >
              <p className="text-[13.5px] text-white leading-relaxed">{msg.text}</p>
              <div className={`flex items-center gap-1 mt-1 ${msg.sent ? "justify-end" : "justify-start"}`}>
                <span className="text-[10.5px]" style={{ color: msg.sent ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.3)" }}>
                  {msg.time}
                </span>
                {msg.sent && (
                  <CheckCheck
                    size={13}
                    style={{ color: msg.status === "read" ? "#60A5FA" : "rgba(255,255,255,0.38)" }}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-t border-white/[0.05]">
        <button className="w-8 h-8 flex items-center justify-center">
          <Plus size={22} className="text-white/38" />
        </button>
        <div className="flex-1 flex items-center gap-2 bg-white/[0.07] rounded-full px-4 py-2.5">
          <input
            className="flex-1 bg-transparent text-[13.5px] text-white placeholder-white/28 outline-none"
            placeholder="Message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Smile size={17} className="text-white/35 flex-shrink-0" />
        </div>
        <button
          className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0"
          style={{ background: input ? "#7C4FF0" : "rgba(255,255,255,0.07)" }}
        >
          {input ? <Send size={16} className="text-white" /> : <Mic size={17} className="text-white/38" />}
        </button>
      </div>
      <HomeIndicator />
    </div>
  );
}
