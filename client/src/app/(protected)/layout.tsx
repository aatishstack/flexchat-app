"use client";

import dynamic from "next/dynamic";

import { useAppLifecycle } from "@/hooks/use-app-lifecycle";
import AppNavigation from "@/components/navigation/app-navigation";
import PhoneOnboardingGate from "@/components/onboarding/phone-onboarding-gate";

const CallLayer = dynamic(
  () => import("@/components/chat/calls/call-layer"),
  {
    ssr: false,
  },
);

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useAppLifecycle();

  return (
    <div className="min-h-dvh bg-[var(--fc-app-bg)] text-[var(--fc-theme-text)]">
      <AppNavigation />
      <div className="min-h-dvh lg:pl-[72px]">
        {children}
      </div>
      <CallLayer />
      <PhoneOnboardingGate />
    </div>
  );
}
