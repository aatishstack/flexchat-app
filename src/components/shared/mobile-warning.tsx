"use client";

export default function MobileWarning() {
  return (
    <div className="md:hidden fixed inset-0 z-[9999] bg-[#020206] flex items-center justify-center p-6">

      <div className="glass rounded-[40px] p-8 text-center max-w-sm">

        <h1 className="text-3xl font-black">
          FlexChat
        </h1>

        <p className="mt-4 text-zinc-300 leading-relaxed">
          Mobile responsive UI
          coming in next phase 😎🔥
        </p>
      </div>
    </div>
  );
}