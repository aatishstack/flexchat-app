import { useNavigate } from "react-router";
import { User, Lock, Key, Bell, Moon, Globe, Info, Shield, Zap, ChevronRight, X, Phone, Layers, PlaySquare, Eye, Paintbrush, Fingerprint, Database, HardDrive, HelpCircle, MessageCircle } from "lucide-react";
import { StatusBar, BottomNav, HomeIndicator } from "../components/shared";

export function SettingsScreen() {
  const navigate = useNavigate();

  const groups = [
    {
      title: "Account & Privacy",
      items: [
        { icon: User,        label: "Account",      sub: "Email, password, security" },
        { icon: Lock,        label: "Privacy",      sub: "Visibility, blocked users" },
        { icon: Fingerprint, label: "Security",     sub: "Face ID, Passkeys"         },
      ],
    },
    {
      title: "Features",
      items: [
        { icon: MessageCircle, label: "Chats",    sub: "Backup, wallpaper, enter is send" },
        { icon: Layers,        label: "Stories",  sub: "Story privacy, archive"           },
        { icon: Phone,         label: "Calls",    sub: "Data usage, call recording"       },
      ],
    },
    {
      title: "App Settings",
      items: [
        { icon: Bell,       label: "Notifications", sub: "Message, group & call tones" },
        { icon: HardDrive,  label: "Media Storage", sub: "Network usage, auto-download" },
        { icon: Paintbrush, label: "Appearance",    sub: "Dark theme, chat color"       },
        { icon: Eye,        label: "Accessibility", sub: "Text size, animations"        },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: HelpCircle, label: "Help Center",   sub: "Contact us, FAQ" },
        { icon: Info,       label: "About",         sub: "FlexChat v3.0.0" },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0C0C10]">
      <StatusBar />
      <div className="px-5 pt-2 pb-3">
        <h1 className="text-[22px] font-extrabold text-white">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-4 mx-5 mb-5 p-4 rounded-2xl hover:bg-white/[0.06] transition-colors w-[calc(100%-40px)]"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-[18px] font-black text-white flex-shrink-0"
            style={{ background: "#7C4FF0" }}
          >
            AM
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-[15.5px] font-bold text-white">Alex Morgan</div>
            <div className="text-[12.5px] text-white/38 font-medium mt-0.5">@alexmorgan · Online</div>
          </div>
          <ChevronRight size={17} className="text-white/28 flex-shrink-0" />
        </button>

        {groups.map((group) => (
          <div key={group.title} className="mb-5">
            <div className="px-5 mb-2">
              <span className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-white/28">{group.title}</span>
            </div>
            <div className="mx-5 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
              {group.items.map(({ icon: Icon, label, sub }, i) => (
                <button
                  key={label}
                  className={`flex items-center gap-3.5 px-4 py-3.5 w-full hover:bg-white/[0.04] transition-colors ${i > 0 ? "border-t border-white/[0.05]" : ""}`}
                >
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: "rgba(124,79,240,0.14)" }}>
                    <Icon size={15} style={{ color: "#7C4FF0" }} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-[13.5px] font-semibold text-white">{label}</div>
                    {sub && <div className="text-[11.5px] text-white/32 font-medium mt-0.5">{sub}</div>}
                  </div>
                  <ChevronRight size={15} className="text-white/22 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="mx-5 mb-5">
          <button className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl hover:bg-red-500/[0.12] transition-colors" style={{ background: "rgba(239,68,68,0.08)" }}>
            <X size={17} className="text-red-400" />
            <span className="text-[13.5px] font-bold text-red-400">Sign Out</span>
          </button>
        </div>
        <p className="text-center text-[10.5px] text-white/18 pb-5">FlexChat 3.0.0 · © 2024 FlexCorp Ltd.</p>
      </div>

      <BottomNav />
      <HomeIndicator />
    </div>
  );
}


