"use client";

import { useAppLifecycle } from "@/hooks/use-app-lifecycle";
import AppNavigation from "@/components/navigation/app-navigation";
import PhoneOnboardingGate from "@/components/onboarding/phone-onboarding-gate";

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
      <PhoneOnboardingGate />
    </div>
  );
}
