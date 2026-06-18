"use client";

import {
  AnimatePresence,
  motion,
} from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Bell,
  CircleDashed,
  Compass,
  MessageCircle,
  PhoneCall,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";
import { useConversationStore } from "@/stores/conversation.store";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/chat",
    label: "Chats",
    icon: MessageCircle,
  },
  {
    href: "/status",
    label: "Status",
    icon: CircleDashed,
  },
  {
    href: "/discover",
    label: "Discover",
    icon: Compass,
  },
  {
    href: "/calls",
    label: "Calls",
    icon: PhoneCall,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function DesktopNavigation({ pathname }: { pathname: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-[190] hidden w-[80px] flex-col items-center border-r border-white/[0.03] bg-[#0C0C10] py-[calc(1.5rem+env(safe-area-inset-top))] lg:flex">
      <Link
        href="/chat"
        className="mb-8 flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#7C4FF0] text-white shadow-xl shadow-[#7C4FF0]/30 transition active:scale-95"
        aria-label="FlexChat Home"
      >
        <img src="/logo.jpeg" alt="" className="h-full w-full object-cover rounded-[22px]" />
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex h-12 w-12 items-center justify-center rounded-[18px] transition-all",
                active 
                  ? "bg-[#7C4FF0]/10 text-[#7C4FF0]" 
                  : "text-white/30 hover:bg-white/[0.04] hover:text-white"
              )}
            >
              <Icon size={22} className={cn("transition-transform", active && "scale-110")} />
              {active && (
                <motion.div 
                  layoutId="desktop-nav-active"
                  className="absolute left-0 h-6 w-1 rounded-r-full bg-[#7C4FF0]" 
                />
              )}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/settings"
        className="mt-auto flex h-12 w-12 items-center justify-center rounded-[18px] text-white/30 transition hover:bg-white/[0.04] hover:text-white"
      >
        <Settings size={22} />
      </Link>
    </aside>
  );
}

function MobileNavigation({
  pathname,
  hidden,
}: {
  pathname: string;
  hidden: boolean;
}) {
  if (hidden) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[190] flex h-[calc(60px+env(safe-area-inset-bottom))] w-full bg-[#0C0C10] pb-[env(safe-area-inset-bottom)] lg:hidden border-t border-white/[0.06]">
      <div className="flex h-full w-full items-center justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => triggerHaptic(10)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-full flex-1 flex-col items-center justify-center transition-colors duration-200",
                active ? "text-[#7C4FF0]" : "text-white/32 hover:text-white/70",
              )}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-colors mb-0.5",
                active ? "bg-[#7C4FF0]/[0.14]" : ""
              )}>
                <Icon
                  size={21}
                  strokeWidth={active ? 2.5 : 1.8}
                  className={cn(
                    "transition-transform duration-200",
                    active && "scale-110",
                  )}
                />
              </div>
              <span className="text-[10px] font-semibold tracking-wide">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function AppNavigation() {
  const pathname = usePathname();
  const activeConversationId = useConversationStore(
    (state) => state.activeConversationId,
  );
  const hideMobileNavigation =
    pathname.startsWith("/chat") && !!activeConversationId;

  return (
    <>
      <DesktopNavigation pathname={pathname} />
      <MobileNavigation
        pathname={pathname}
        hidden={hideMobileNavigation}
      />
    </>
  );
}
