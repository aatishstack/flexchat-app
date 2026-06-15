import FlexLogo from "@/components/shared/flex-logo";

type RouteLoadingProps = {
  variant?: "app" | "auth" | "chat";
};

function SkeletonBlock({
  className,
}: {
  className: string;
}) {
  return <div className={`fc-skeleton animate-pulse ${className}`} />;
}

function ChatRouteLoading() {
  return (
    <div className="flex h-dvh min-h-svh overflow-hidden bg-black text-[var(--fc-theme-text)]">
      <aside className="hidden w-[360px] shrink-0 border-r border-[var(--fc-app-border)] bg-black p-4 lg:block">
        <div className="flex items-center gap-3">
          <FlexLogo size="md" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBlock className="h-4 w-28 rounded-full bg-white/[0.03]" />
            <SkeletonBlock className="h-3 w-40 rounded-full bg-white/[0.03]" />
          </div>
        </div>

        <SkeletonBlock className="mt-5 h-10 rounded-xl bg-white/[0.03]" />

        <div className="mt-6 space-y-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex min-h-[72px] items-center gap-3">
              <SkeletonBlock className="h-14 w-14 shrink-0 rounded-[18px] bg-white/[0.03]" />
              <div className="min-w-0 flex-1 space-y-2.5">
                <SkeletonBlock className="h-4 w-2/5 rounded-full bg-white/[0.03]" />
                <SkeletonBlock className="h-3 w-4/5 rounded-full bg-white/[0.03]" />
              </div>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-black">
        <div className="flex h-[72px] shrink-0 items-center gap-3 border-b border-[var(--fc-app-border)] bg-black px-4">
          <SkeletonBlock className="h-11 w-11 rounded-full bg-white/[0.03]" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBlock className="h-4 w-36 rounded-full bg-white/[0.03]" />
            <SkeletonBlock className="h-3 w-24 rounded-full bg-white/[0.03]" />
          </div>
          <div className="flex gap-2">
             <SkeletonBlock className="h-10 w-10 rounded-full bg-white/[0.03]" />
             <SkeletonBlock className="h-10 w-10 rounded-full bg-white/[0.03]" />
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-hidden p-5 sm:p-7">
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              className={`flex ${index % 3 === 0 ? "justify-end" : "justify-start"}`}
            >
              <SkeletonBlock className={`h-16 w-[min(78%,440px)] rounded-[18px] bg-white/[0.03] ${index % 3 === 0 ? "rounded-tr-none" : "rounded-tl-none"}`} />
            </div>
          ))}
        </div>

        <div className="shrink-0 p-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <SkeletonBlock className="h-14 rounded-[24px] bg-white/[0.03]" />
        </div>
      </section>
    </div>
  );
}

function AuthRouteLoading() {
  return (
    <main className="grid min-h-svh bg-black text-white lg:grid-cols-[minmax(360px,0.9fr)_minmax(420px,1.1fr)]">
      <section className="hidden border-r border-white/10 p-10 xl:p-16 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-4">
          <FlexLogo size="lg" />
          <SkeletonBlock className="h-7 w-32 rounded-full bg-white/[0.05]" />
        </div>
        <div className="space-y-6">
          <SkeletonBlock className="h-16 w-4/5 rounded-full bg-white/[0.05]" />
          <SkeletonBlock className="h-16 w-3/5 rounded-full bg-white/[0.05]" />
          <SkeletonBlock className="h-6 w-2/3 rounded-full bg-white/[0.05]" />
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-24 max-w-md rounded-[22px] bg-white/[0.05]" />
          ))}
        </div>
      </section>

      <section className="flex min-h-svh items-center justify-center px-4 py-8">
        <div className="w-full max-w-[420px] space-y-6">
          <SkeletonBlock className="mx-auto h-12 w-44 rounded-[14px] bg-white/[0.05] lg:hidden" />
          <SkeletonBlock className="h-14 rounded-2xl bg-white/[0.05]" />
          <div className="space-y-6 rounded-[24px] border border-white/10 bg-white/[0.03] p-6 sm:p-9">
            <SkeletonBlock className="h-9 w-48 rounded-full bg-white/[0.05]" />
            <SkeletonBlock className="h-4 w-64 rounded-full bg-white/[0.05]" />
            <SkeletonBlock className="h-14 rounded-xl bg-white/[0.05]" />
            <SkeletonBlock className="h-14 rounded-xl bg-white/[0.05]" />
            <SkeletonBlock className="h-14 rounded-xl bg-white/[0.05]" />
          </div>
        </div>
      </section>
    </main>
  );
}

function AppRouteLoading() {
  return (
    <main className="min-h-dvh bg-[var(--fc-app-bg)] px-4 py-[calc(1rem+env(safe-area-inset-top))] text-[var(--fc-theme-text)] sm:px-6 lg:pl-[calc(72px+1.5rem)]">
      <section className="mx-auto max-w-3xl space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <SkeletonBlock className="h-7 w-44 rounded-full" />
            <SkeletonBlock className="h-4 w-64 rounded-full" />
          </div>
          <FlexLogo size="md" variant="soft" />
        </div>

        <div className="grid gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[22px] border border-[var(--fc-app-border)] bg-[var(--fc-app-panel)] p-4"
            >
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-10 w-10 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <SkeletonBlock className="h-4 w-2/5 rounded-full" />
                  <SkeletonBlock className="h-3 w-4/5 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default function RouteLoading({
  variant = "app",
}: RouteLoadingProps) {
  if (variant === "chat") {
    return <ChatRouteLoading />;
  }

  if (variant === "auth") {
    return <AuthRouteLoading />;
  }

  return <AppRouteLoading />;
}
