import { useNavigate } from "react-router";
import { Search, Compass, TrendingUp, Users, Hash, Flame } from "lucide-react";
import { StatusBar, Avatar, BottomNav, HomeIndicator } from "../components/shared";

export function DiscoverScreen() {
  const navigate = useNavigate();

  const trending = [
    { title: "#DesignTwitter", users: "12.4K", icon: Flame, color: "#EF4444" },
    { title: "React Devs", users: "8.2K", icon: Users, color: "#3B82F6" },
    { title: "#UIUX", users: "5.1K", icon: Hash, color: "#8B5CF6" },
    { title: "Startups", users: "4.9K", icon: TrendingUp, color: "#10B981" },
  ];

  const communities = [
    { name: "Figma Community", desc: "Design system talk", members: "124K", img: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&q=80" },
    { name: "Frontend Masters", desc: "React, Vue, Svelte", members: "89K", img: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=100&q=80" },
    { name: "Product Hunt", desc: "Daily tech news", members: "250K", img: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=100&q=80" },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0C0C10]">
      <StatusBar />
      <div className="flex items-center justify-between px-5 pt-2 pb-3">
        <h1 className="text-[22px] font-extrabold text-white">Discover</h1>
        <button className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06]">
          <Compass size={18} className="text-white/60" />
        </button>
      </div>

      <div className="px-5 mb-4">
        <div className="flex items-center gap-2 bg-white/[0.07] rounded-xl px-3 py-2.5">
          <Search size={16} className="text-white/40" />
          <input
            className="flex-1 bg-transparent text-[13.5px] text-white placeholder-white/40 outline-none"
            placeholder="Search channels, people, topics"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {/* Trending */}
        <div className="px-5 mb-6">
          <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-white/28 mb-3 block">Trending Topics</span>
          <div className="grid grid-cols-2 gap-2.5">
            {trending.map((t, i) => (
              <div key={i} className="flex flex-col gap-2 p-3.5 rounded-2xl border border-white/[0.04]" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${t.color}20` }}>
                  <t.icon size={15} style={{ color: t.color }} />
                </div>
                <div>
                  <div className="text-[13.5px] font-bold text-white">{t.title}</div>
                  <div className="text-[11px] font-medium text-white/40 mt-0.5">{t.users} talking</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Suggested Communities */}
        <div className="px-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-white/28">Suggested Channels</span>
            <button className="text-[12px] font-bold" style={{ color: "#7C4FF0" }}>See All</button>
          </div>
          <div className="flex flex-col gap-2">
            {communities.map((c, i) => (
              <div key={i} className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-white/[0.04] transition-colors">
                <Avatar initials={c.name[0]} color="#374151" size={48} imgUrl={c.img} />
                <div className="flex-1 min-w-0">
                  <div className="text-[14.5px] font-bold text-white">{c.name}</div>
                  <div className="text-[12.5px] text-white/50 truncate mt-0.5">{c.desc}</div>
                </div>
                <button className="px-3.5 py-1.5 rounded-full text-[11.5px] font-bold bg-white/10 text-white hover:bg-white/20 transition-colors">
                  Join
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
      <HomeIndicator />
    </div>
  );
}
