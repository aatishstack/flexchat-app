import { MessageCircle, Phone, Bell, Settings, Layers, Compass, Users } from "lucide-react";
import { useLocation, useNavigate } from "react-router";

export function FlexLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <rect width="40" height="40" rx="11" fill="#7C4FF0" />
      <rect x="11" y="10" width="6" height="20" rx="1.5" fill="white" />
      <rect x="11" y="10" width="18.5" height="5.5" rx="1.5" fill="white" />
      <rect x="11" y="18.5" width="13.5" height="5" rx="1.5" fill="white" />
    </svg>
  );
}

export function StatusBar({ light = false }: { light?: boolean }) {
  const tc = light ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.65)";
  return (
    <div className="flex items-center justify-between px-5 pt-3.5 pb-1.5" style={{ color: tc }}>
      <span className="text-[12.5px] font-bold tracking-tight">9:41</span>
      <div className="flex items-center gap-1.5">
        <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor">
          <rect x="0"    y="7"   width="3" height="5"  rx="0.5" opacity="0.35" />
          <rect x="4.5"  y="4.5" width="3" height="7.5" rx="0.5" opacity="0.6"  />
          <rect x="9"    y="2"   width="3" height="10" rx="0.5" opacity="0.85" />
          <rect x="13.5" y="0"   width="3" height="12" rx="0.5" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
          <circle cx="8" cy="10" r="1.8" />
          <path d="M4.8 7.5C5.7 6.6 6.8 6 8 6s2.3.6 3.2 1.5L12.5 6C11.2 4.8 9.7 4 8 4S4.8 4.8 3.5 6L4.8 7.5z" opacity="0.8" />
          <path d="M2 5C3.4 3.5 5.6 2.5 8 2.5s4.6 1 6 2.5L15.3 3.7C13.5 1.9 10.9 1 8 1S2.5 1.9.7 3.7L2 5z" opacity="0.45" />
        </svg>
        <div className="flex items-center gap-[2px]">
          <div className="w-[22px] h-[11px] rounded-[3px] border border-current/50 flex items-center p-[2px]">
            <div className="h-full rounded-[2px] bg-current" style={{ width: "78%" }} />
          </div>
          <div className="w-[2px] h-[5px] rounded-r-sm bg-current/40" />
        </div>
      </div>
    </div>
  );
}

export function HomeIndicator() {
  return (
    <div className="flex justify-center pb-2 pt-1 z-50">
      <div className="w-28 h-1 rounded-full bg-white/[0.18]" />
    </div>
  );
}

export function Avatar({ initials, color, size = 44, online = false, imgUrl }: {
  initials: string; color: string; size?: number; online?: boolean; imgUrl?: string;
}) {
  return (
    <div className="relative flex-shrink-0">
      <div
        className="flex items-center justify-center rounded-full font-bold text-white overflow-hidden bg-cover bg-center"
        style={{ 
          width: size, height: size, background: imgUrl ? `url(${imgUrl}) center/cover` : color, fontSize: size * 0.33 
        }}
      >
        {!imgUrl && initials}
      </div>
      {online && (
        <div
          className="absolute bottom-0 right-0 rounded-full border-2 border-[#0C0C10] bg-emerald-400"
          style={{ width: 12, height: 12 }}
        />
      )}
    </div>
  );
}

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const active = location.pathname.substring(1) || "chats";
  
  const items = [
    { icon: MessageCircle, label: "Chats",    screen: "chats"         },
    { icon: Phone,         label: "Calls",    screen: "calls"         },
    { icon: Layers,        label: "Stories",  screen: "stories"       },
    { icon: Compass,       label: "Discover", screen: "discover"      },
    { icon: Settings,      label: "Settings", screen: "settings"      },
  ];
  return (
    <div className="flex items-center justify-around border-t border-white/[0.06] bg-[#0C0C10] z-50">
      {items.map(({ icon: Icon, label, screen }) => {
        const on = active === screen;
        return (
          <button key={screen} onClick={() => navigate(`/${screen}`)} className="flex flex-col items-center gap-0.5 py-2.5 px-3">
            <div className={`p-1.5 rounded-xl transition-colors ${on ? "bg-[#7C4FF0]/[0.14]" : ""}`}>
              <Icon size={21} style={{ color: on ? "#7C4FF0" : "rgba(255,255,255,0.32)" }} strokeWidth={on ? 2.5 : 1.8} />
            </div>
            <span className="text-[10px] font-semibold" style={{ color: on ? "#7C4FF0" : "rgba(255,255,255,0.32)" }}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
