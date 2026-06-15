import StoryTray from "@/components/chat/stories/story-tray";

export default function StatusPage() {
  return (
    <main className="min-h-[100dvh] bg-black px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-[max(env(safe-area-inset-top),1rem)] text-white">
      <div className="mx-auto max-w-3xl">
        <header className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight">
            Status
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Brief updates from your contacts.
          </p>
        </header>

        <section className="rounded-2xl border border-white/[0.06] bg-[#0A0A0A] p-4">
          <StoryTray />
        </section>
      </div>
    </main>
  );
}
