"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Bell,
  Compass,
  MessageCircle,
  PhoneCall,
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
    href: "/calls",
    label: "Calls",
    icon: PhoneCall,
  },
  {
    href: "/discover",
    label: "Discover",
    icon: Compass,
  },
  {
    href: "/notifications",
    label: "Notifications",
    icon: Bell,
  },
  {
    href: "/profile",
    label: "Profile",
    icon: UserRound,
  },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function DesktopNavigation({ pathname }: { pathname: string }) {
  return (
    <aside className="fc-panel fixed inset-y-0 left-0 z-[190] hidden w-[72px] border-r border-[var(--fc-app-border)] bg-black px-2 py-[calc(1.25rem+env(safe-area-inset-top))] lg:flex lg:flex-col lg:items-center">
      <Link
        href="/chat"
        className="fc-button-primary mb-6 flex h-11 w-11 items-center justify-center rounded-[14px] shadow-lg shadow-[rgba(var(--fc-primary-rgb),0.2)]"
        aria-label="Open chats"
      >
        <MessageCircle size={21} />
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-3">
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
                "group fc-touch relative flex h-11 w-11 items-center justify-center rounded-[14px] text-[var(--fc-text-subtle)] transition hover:bg-white/5 hover:text-[var(--fc-theme-text)]",
                active && "bg-[var(--fc-primary)] text-white shadow-md shadow-[rgba(var(--fc-primary-rgb),0.1)]",
              )}
            >
              <Icon size={20} />
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        })}
      </nav>
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
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-[190] flex justify-center pb-[calc(1rem+env(safe-area-inset-bottom))] lg:hidden">
      <div className="pointer-events-auto flex h-[64px] items-center gap-1 rounded-[24px] border border-white/10 bg-[rgba(10,10,10,0.85)] px-2 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-3xl">
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
                "fc-touch relative flex h-[48px] min-w-[56px] flex-col items-center justify-center rounded-2xl transition-all duration-200",
                active ? "text-[var(--fc-primary)]" : "text-[var(--fc-text-subtle)] hover:text-white",
              )}
            >
              <div className={cn(
                "flex h-9 w-12 items-center justify-center rounded-full transition-colors",
                active && "bg-[var(--fc-primary)]/10"
              )}>
                <Icon
                  size={20}
                  className={cn(
                    "transition-transform",
                    active && "scale-110",
                  )}
                />
              </div>
              <span className="mt-0.5 text-[10px] font-bold tracking-tight">{item.label}</span>
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
