"use client";

import { useAuth } from "@/hooks/useAuth";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-[#070B14] px-6 py-8 text-white">
      <section className="mx-auto max-w-3xl rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-purple-950/20 backdrop-blur-2xl">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-2xl font-bold">
            {user?.username?.charAt(0).toUpperCase() ?? "F"}
          </div>

          <div>
            <h1 className="text-2xl font-semibold">
              {user?.username ?? "FlexChat User"}
            </h1>
            <p className="text-sm text-zinc-400">
              {user?.email ?? "Secure realtime profile"}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
