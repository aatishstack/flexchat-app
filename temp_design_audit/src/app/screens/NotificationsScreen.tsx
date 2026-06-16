import { useNavigate } from "react-router";
import { MoreVertical, MessageCircle, Phone, Info, ArrowLeft } from "lucide-react";
import { StatusBar, Avatar, HomeIndicator } from "../components/shared";
import { NOTIFS } from "../data";

export function NotificationsScreen() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-full bg-[#0C0C10]">
      <StatusBar />
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2">
            <ArrowLeft size={21} className="text-white/65" />
          </button>
          <h1 className="text-[20px] font-extrabold text-white">Notifications</h1>
        </div>
        <button className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06]">
          <MoreVertical size={17} className="text-white/55" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {NOTIFS.map((group) => (
          <div key={group.group}>
            <div className="px-5 py-2">
              <span className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-white/28">{group.group}</span>
            </div>
            {group.items.map((item) => (
              <button
                key={item.id}
                onClick={() => item.type === "message" ? navigate("/conversation") : undefined}
                className="flex items-start gap-3.5 px-5 py-3 w-full hover:bg-white/[0.03] transition-colors"
              >
                <div className="relative flex-shrink-0 mt-0.5">
                  <Avatar initials={item.initials} color={item.color} size={44} />
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-[#0C0C10]"
                    style={{ background: item.type === "message" ? "#7C4FF0" : item.type === "call" ? "#059669" : "#374151" }}
                  >
                    {item.type === "message" && <MessageCircle size={9} className="text-white" />}
                    {item.type === "call"    && <Phone          size={9} className="text-white" />}
                    {item.type === "system"  && <Info           size={9} className="text-white" />}
                  </div>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[14px] font-semibold text-white">{item.name}</span>
                    {item.unread && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#7C4FF0" }} />}
                  </div>
                  <p className="text-[12.5px] text-white/42 leading-snug">{item.text}</p>
                  <span className="text-[11px] text-white/22 mt-0.5 block">{item.time}</span>
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>

      <HomeIndicator />
    </div>
  );
}
