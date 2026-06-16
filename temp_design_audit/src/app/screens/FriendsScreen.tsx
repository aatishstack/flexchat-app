import { useNavigate } from "react-router";
import { UserPlus, Search, UserCheck, ArrowLeft } from "lucide-react";
import { StatusBar, Avatar, HomeIndicator } from "../components/shared";
import { CHATS } from "../data";

export function FriendsScreen() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-[#0C0C10]">
      <StatusBar />
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2">
            <ArrowLeft size={21} className="text-white/65" />
          </button>
          <h1 className="text-[20px] font-extrabold text-white">Friends</h1>
        </div>
        <button className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06]">
          <UserPlus size={18} className="text-white/60" />
        </button>
      </div>

      <div className="px-5 mb-4">
        <div className="flex items-center gap-2 bg-white/[0.07] rounded-xl px-3 py-2.5">
          <Search size={16} className="text-white/40" />
          <input
            className="flex-1 bg-transparent text-[13.5px] text-white placeholder-white/40 outline-none"
            placeholder="Search friends"
          />
        </div>
      </div>

      <div className="flex gap-1 mx-5 mb-4 p-1 rounded-xl bg-white/[0.05]">
        <button className="flex-1 py-2 rounded-lg text-[13px] font-bold transition-colors bg-[#7C4FF0] text-white">
          All Friends
        </button>
        <button className="flex-1 py-2 rounded-lg text-[13px] font-bold transition-colors text-white/40 hover:bg-white/[0.05]">
          Requests <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 rounded-full">2</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        <div className="px-5 py-2">
          <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-white/28">Online - {CHATS.filter(c => c.online).length}</span>
        </div>
        {CHATS.filter(c => c.online).map(c => (
          <button
            key={c.id}
            onClick={() => navigate("/profile")}
            className="flex items-center gap-3.5 px-5 py-3 w-full hover:bg-white/[0.03] transition-colors"
          >
            <Avatar initials={c.initials} color={c.color} size={46} online={c.online} />
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[14.5px] font-semibold text-white">{c.name}</div>
              <div className="text-[12.5px] text-emerald-400 font-medium mt-0.5">Online</div>
            </div>
            <div className="flex gap-2">
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06]">
                <UserCheck size={14} className="text-white/60" />
              </div>
            </div>
          </button>
        ))}

        <div className="px-5 py-2 mt-2">
          <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-white/28">Offline</span>
        </div>
        {CHATS.filter(c => !c.online).map(c => (
          <button
            key={c.id}
            onClick={() => navigate("/profile")}
            className="flex items-center gap-3.5 px-5 py-3 w-full hover:bg-white/[0.03] transition-colors"
          >
            <Avatar initials={c.initials} color={c.color} size={46} />
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[14.5px] font-semibold text-white">{c.name}</div>
              <div className="text-[12.5px] text-white/40 font-medium mt-0.5">Last seen recently</div>
            </div>
          </button>
        ))}
      </div>

      <HomeIndicator />
    </div>
  );
}
