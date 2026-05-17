"use client";

const settings = [
  {
    label: "Realtime Presence",
    description: "Show online and typing status across conversations.",
    enabled: true,
  },
  {
    label: "Message Receipts",
    description: "Sync delivered and seen states on every device.",
    enabled: true,
  },
  {
    label: "Motion Effects",
    description: "Keep premium transitions and dock animations enabled.",
    enabled: true,
  },
];

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-[#070B14] px-6 py-8 text-white">
      <section className="mx-auto max-w-3xl rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-purple-950/20 backdrop-blur-2xl">
        <div>
          <h1 className="text-2xl font-semibold">
            Settings
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Conversation controls tuned for a fast messaging workflow.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {settings.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div>
                <h2 className="font-medium">
                  {item.label}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {item.description}
                </p>
              </div>

              <div
                className={`h-7 w-12 rounded-full p-1 ${
                  item.enabled
                    ? "bg-purple-600"
                    : "bg-white/10"
                }`}
              >
                <div
                  className={`h-5 w-5 rounded-full bg-white transition ${
                    item.enabled
                      ? "translate-x-5"
                      : "translate-x-0"
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
