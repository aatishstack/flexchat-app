"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { motion } from "framer-motion";
import {
  MessageCircle,
  PhoneCall,
  Settings,
  UserRound,
  UsersRound,
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
    href: "/contacts",
    label: "Contacts",
    icon: UsersRound,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
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
    <aside className="fc-panel fixed inset-y-0 left-0 z-[190] hidden w-[72px] border-r px-2 py-[calc(0.75rem+env(safe-area-inset-top))] lg:flex lg:flex-col lg:items-center">
      <Link
        href="/chat"
        className="fc-button-primary mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(var(--fc-primary-rgb),0.28)]"
        aria-label="Open chats"
      >
        <MessageCircle size={20} />
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-2">
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
                "group fc-hover relative flex h-12 w-12 items-center justify-center rounded-2xl text-[var(--fc-text-subtle)] transition hover:text-[var(--fc-theme-text)]",
                active && "fc-active text-[var(--fc-theme-text)]",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="desktop-nav-active"
                  className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-[var(--fc-primary)]"
                  transition={{
                    type: "spring",
                    stiffness: 420,
                    damping: 34,
                  }}
                />
              ) : null}
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
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-[190] h-[calc(56px+env(safe-area-inset-bottom))] border-t border-[var(--fc-app-border)] bg-[var(--fc-app-panel)] pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_32px_rgba(0,0,0,0.22)] lg:hidden">
      <div className="pointer-events-auto mx-auto grid h-14 max-w-md grid-cols-5 gap-0.5 px-1">
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
                "fc-telegram-touch relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[10px] font-medium text-[var(--fc-text-subtle)] transition",
                active &&
                  "bg-[var(--fc-app-surface-active)] text-[var(--fc-theme-text)]",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="mobile-nav-active"
                  className="absolute inset-x-4 top-1 h-0.5 rounded-full bg-[var(--fc-primary)]"
                  transition={{
                    type: "spring",
                    stiffness: 420,
                    damping: 34,
                  }}
                />
              ) : null}
              <Icon
                size={20}
                className={cn(
                  "transition",
                  active && "text-[var(--fc-accent-text)]",
                )}
              />
              <span>{item.label}</span>
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
