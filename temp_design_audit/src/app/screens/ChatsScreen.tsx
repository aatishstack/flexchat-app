import { useNavigate } from "react-router";
import { Search, Pencil, Bell } from "lucide-react";
import { StatusBar, FlexLogo, Avatar, BottomNav, HomeIndicator } from "../components/shared";
import { CHATS } from "../data";

export function ChatsScreen() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-[#0C0C10]">
      <StatusBar />
      <div className="flex items-center justify-between px-5 py-2.5">
        <div className="flex items-center gap-2.5">
          <FlexLogo size={30} />
          <span className="text-[20px] font-extrabold text-white tracking-tight">FlexChat</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/friends")} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06]">
            <Search size={16} className="text-white/60" />
          </button>
          <button onClick={() => navigate("/notifications")} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06]">
            <Bell size={16} className="text-white/60" />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06]">
            <Pencil size={16} className="text-white/60" />
          </button>
        </div>
      </div>

      {/* Active row */}
      <div className="px-5 pt-1 pb-3">
        <div className="flex gap-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {CHATS.slice(0, 6).map((c) => (
            <button key={c.id} className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div
                className="rounded-full p-[2.5px]"
                style={{ background: c.online ? "#7C4FF0" : "transparent" }}
              >
                <div className="bg-[#0C0C10] rounded-full p-[2px]">
                  <Avatar initials={c.initials} color={c.color} size={44} />
                </div>
              </div>
              <span className="text-[10px] text-white/45 font-medium max-w-[52px] truncate">
                {c.name.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mx-5 border-t border-white/[0.05]" />

      {/* List */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {CHATS.map((c) => (
          <button
            key={c.id}
            onClick={() => navigate("/conversation")}
            className="flex items-center gap-3.5 px-5 py-3 w-full hover:bg-white/[0.03] transition-colors"
          >
            <Avatar initials={c.initials} color={c.color} online={c.online} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-[3px]">
                <span className="text-[14.5px] font-semibold text-white">{c.name}</span>
                <span className="text-[11px] font-medium" style={{ color: c.unread > 0 ? "#7C4FF0" : "rgba(255,255,255,0.28)" }}>
                  {c.time}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-white/38 truncate pr-2">{c.lastMsg}</span>
                {c.unread > 0 && (
                  <div className="min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5 text-[11px] font-bold text-white flex-shrink-0" style={{ background: "#7C4FF0" }}>
                    {c.unread}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <BottomNav />
      <HomeIndicator />
    </div>
  );
}
