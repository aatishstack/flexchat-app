import { useNavigate } from "react-router";
import { Plus, MoreVertical } from "lucide-react";
import { StatusBar, Avatar, BottomNav, HomeIndicator } from "../components/shared";
import { STORIES } from "../data";

export function StoryTrayScreen() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-[#0C0C10]">
      <StatusBar />
      <div className="flex items-center justify-between px-5 py-2.5">
        <h1 className="text-[22px] font-extrabold text-white tracking-tight">Stories</h1>
        <button className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06]">
          <MoreVertical size={16} className="text-white/60" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {/* Horizontal tray - optional if we also list them vertically */}
        <div className="px-5 pt-3 pb-4">
          <div className="flex gap-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {STORIES.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/story/${s.id}`)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0"
              >
                <div className="relative">
                  <div
                    className="rounded-full p-[2.5px]"
                    style={{ background: s.isMe ? "transparent" : s.viewed ? "rgba(255,255,255,0.1)" : "#7C4FF0" }}
                  >
                    <div className="bg-[#0C0C10] rounded-full p-[2px]">
                      <Avatar initials={s.initials} color={s.color} size={52} imgUrl={s.image} />
                    </div>
                  </div>
                  {s.isMe && (
                    <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0C0C10]" style={{ background: "#7C4FF0" }}>
                      <Plus size={12} className="text-white" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-white/60 font-medium max-w-[60px] truncate">
                  {s.isMe ? "Add Story" : s.name.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mx-5 border-t border-white/[0.05] mb-2" />

        <div className="px-5 py-2">
          <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-white/28">Recent Updates</span>
        </div>

        <div className="flex flex-col">
          {STORIES.filter((s) => !s.isMe).map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/story/${s.id}`)}
              className="flex items-center gap-3.5 px-5 py-3 w-full hover:bg-white/[0.03] transition-colors"
            >
              <div
                className="rounded-full p-[2px]"
                style={{ background: s.viewed ? "rgba(255,255,255,0.1)" : "#7C4FF0" }}
              >
                <div className="bg-[#0C0C10] rounded-full p-[2px]">
                  <Avatar initials={s.initials} color={s.color} size={46} imgUrl={s.image} />
                </div>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[14.5px] font-semibold text-white mb-0.5">{s.name}</div>
                <div className="text-[12px] text-white/40 font-medium">{s.viewed ? "Viewed" : "2h ago"}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <BottomNav />
      <HomeIndicator />
    </div>
  );
}
