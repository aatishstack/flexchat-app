"use client";

import {
  Bot,
  Users,
  Phone,
  Bell,
  CircleDot,
  User,
  Palette,
  LogOut,
} from "lucide-react";

interface Props {
  setShowProfile?: any;
  setShowSettings?: any;
  handleLogout?: any;
}

export default function FlexDock({
  setShowProfile,
  setShowSettings,
  handleLogout,
}: Props) {

  const handleAction = (
    label: string
  ) => {

    alert(
      `${label} panel coming soon`
    );
  };

  return (

    <div className="flex items-center gap-3 rounded-[28px] border border-white/10 bg-black/40 px-4 py-4 shadow-2xl backdrop-blur-3xl">

      {/* AI */}

      <button
        onClick={() =>
          handleAction("AI")
        }
        className="rounded-2xl p-4 text-white/60 transition hover:bg-cyan-500/20 hover:text-cyan-300"
      >

        <Bot size={24} />

      </button>

      {/* FRIENDS */}

      <button
        onClick={() =>
          handleAction(
            "Friends"
          )
        }
        className="rounded-2xl p-4 text-white/60 transition hover:bg-cyan-500/20 hover:text-cyan-300"
      >

        <Users size={24} />

      </button>

      {/* CALLS */}

      <button
        onClick={() =>
          handleAction("Calls")
        }
        className="rounded-2xl p-4 text-white/60 transition hover:bg-cyan-500/20 hover:text-cyan-300"
      >

        <Phone size={24} />

      </button>

      {/* ALERTS */}

      <button
        onClick={() =>
          handleAction(
            "Alerts"
          )
        }
        className="rounded-2xl p-4 text-white/60 transition hover:bg-cyan-500/20 hover:text-cyan-300"
      >

        <Bell size={24} />

      </button>

      {/* STATUS */}

      <button
        onClick={() =>
          handleAction(
            "Status"
          )
        }
        className="rounded-2xl p-4 text-white/60 transition hover:bg-cyan-500/20 hover:text-cyan-300"
      >

        <CircleDot size={24} />

      </button>

      <div className="mx-1 h-8 w-px bg-white/10" />

      {/* PROFILE */}

      <button
        onClick={() =>
          setShowProfile?.(true)
        }
        className="rounded-2xl p-4 text-white/60 transition hover:bg-white/10 hover:text-white"
      >

        <User size={22} />

      </button>

      {/* THEMES */}

      <button
        onClick={() =>
          setShowSettings?.(true)
        }
        className="rounded-2xl p-4 text-white/60 transition hover:bg-cyan-500/20 hover:text-cyan-300"
      >

        <Palette size={22} />

      </button>

      {/* LOGOUT */}

      <button
        onClick={handleLogout}
        className="rounded-2xl p-4 text-red-300 transition hover:bg-red-500/20"
      >

        <LogOut size={22} />

      </button>

    </div>
  );
}