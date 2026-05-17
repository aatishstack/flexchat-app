"use client";

interface Props {
  activeChat?: string;
  setActiveChat?: (
    value: string
  ) => void;
}

type SidebarChat = {
  id: string;
  name: string;
  message: string;
  online?: boolean;
};

const chats: SidebarChat[] = [];

export default function ChatSidebar({
  activeChat,
  setActiveChat,
}: Props) {

  return (

    <div className="w-[320px] border-r border-white/10 bg-black/20 backdrop-blur-3xl">

      {/* TOP */}

      <div className="p-5">

        <p className="text-sm font-semibold tracking-widest text-cyan-400">

          FLEXCHAT

        </p>

        <h1 className="mt-2 text-5xl font-black text-white">

          Messages

        </h1>

        <input
          placeholder="Search chats..."
          className="mt-6 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm outline-none placeholder:text-white/30"
        />

      </div>

      {/* CHATS */}

      <div className="space-y-3 px-3">

        {chats.map(
          (
            chat
          ) => (

            <button
              key={chat.id}
              onClick={() =>
                setActiveChat?.(
                  chat.name
                )
              }
              className={`flex w-full items-center gap-4 rounded-3xl border px-4 py-4 transition-all ${
                activeChat ===
                chat.name
                  ? "border-cyan-500/30 bg-cyan-500/10"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >

              <div className="relative">

                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 text-xl font-black text-white">

                  {chat.name[0]}

                </div>

                {chat.online && (

                  <div className="absolute bottom-1 right-1 h-3 w-3 rounded-full bg-green-400" />

                )}

              </div>

              <div className="flex-1 text-left">

                <h2 className="font-bold text-white">

                  {chat.name}

                </h2>

                <p className="text-sm text-white/50">

                  {chat.message}

                </p>

              </div>

            </button>
          )
        )}

      </div>

    </div>
  );
}
