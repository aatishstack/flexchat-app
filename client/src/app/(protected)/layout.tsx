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
    <div className="min-h-dvh bg-[#0C0C10] text-[#F0EEF8]">
      <AppNavigation />
      <div className="min-h-dvh w-full lg:pl-[80px] lg:pr-[80px] flex flex-col">
        <div className="flex-1 w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
      <CallLayer />
      <PhoneOnboardingGate />
    </div>
  );
}
