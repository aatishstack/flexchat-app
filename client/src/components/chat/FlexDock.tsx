"use client";

import {
  Bot,
  Palette,
  User,
  Users,
  LogOut,
  Sparkles,
  Settings,
  Bookmark,
} from "lucide-react";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

import {
  useEffect,
  useRef,
  useState,
} from "react";

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

  const [
    open,
    setOpen,
  ] = useState(false);

  const dockRef =
    useRef<any>(null);

  useEffect(() => {

    const handleClickOutside =
      (
        event: MouseEvent
      ) => {

        if (
          dockRef.current &&
          !dockRef.current.contains(
            event.target
          )
        ) {

          setOpen(false);
        }
      };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {

      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };

  }, []);

  const handleSafeAction = (
    callback?: any
  ) => {

    setOpen(false);

    if (callback) {

      callback();
    }
  };

  const items = [

    {
      label: "AI Assistant",
      icon: Bot,
      action: () =>
        alert(
          "AI Assistant coming soon"
        ),
    },

    {
      label: "Themes",
      icon: Palette,
      action: () => {

        if (
          setShowSettings
        ) {

          setShowSettings(
            true
          );

        } else {

          alert(
            "Themes panel coming soon"
          );
        }
      },
    },

    {
      label: "Profile",
      icon: User,
      action: () => {

        if (
          setShowProfile
        ) {

          setShowProfile(
            true
          );

        } else {

          alert(
            "Profile panel coming soon"
          );
        }
      },
    },

    {
      label: "Friends",
      icon: Users,
      action: () =>
        alert(
          "Friends system coming soon"
        ),
    },

    {
      label: "Saved Messages",
      icon: Bookmark,
      action: () =>
        alert(
          "Saved messages coming soon"
        ),
    },

    {
      label: "Premium",
      icon: Sparkles,
      action: () =>
        alert(
          "Premium features coming soon"
        ),
    },

    {
      label: "Settings",
      icon: Settings,
      action: () => {

        if (
          setShowSettings
        ) {

          setShowSettings(
            true
          );

        } else {

          alert(
            "Settings panel coming soon"
          );
        }
      },
    },

    {
      label: "Logout",
      icon: LogOut,
      action: handleLogout
        ? handleLogout
        : () =>
            alert(
              "Logout not connected"
            ),
      danger: true,
    },
  ];

  return (

    <div
      ref={dockRef}
      className="relative z-[999999]"
    >

      {/* SETTINGS BUTTON */}

      <motion.button

        whileHover={{
          scale: 1.06,
        }}

        whileTap={{
          scale: 0.94,
        }}

        onClick={() =>
          setOpen(
            (prev) =>
              !prev
          )
        }

        className="group relative flex h-[50px] w-[50px] items-center justify-center rounded-2xl border border-white/10 bg-[#0d1626] shadow-[0_0_25px_rgba(0,0,0,0.35)] transition-all duration-300 hover:border-cyan-400/30 hover:bg-[#13233c]"
      >

        {/* GLOW */}

        <div className="absolute inset-0 rounded-2xl bg-cyan-400/0 transition-all duration-300 group-hover:bg-cyan-400/10" />

        {/* ICON */}

        <Settings
          size={22}
          strokeWidth={2.2}
          className="relative z-10 text-cyan-300 transition-all duration-300 group-hover:text-cyan-200"
        />

      </motion.button>

      {/* PANEL */}

      <AnimatePresence>

        {open && (

          <motion.div

            initial={{
              opacity: 0,
              y: 12,
              scale: 0.96,
            }}

            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}

            exit={{
              opacity: 0,
              y: 12,
              scale: 0.96,
            }}

            transition={{
              duration: 0.16,
            }}

            className="absolute right-0 top-[68px] z-[9999999] w-[285px] overflow-hidden rounded-[32px] border border-white/10 bg-[#08111f]/96 p-3 shadow-[0_30px_90px_rgba(0,0,0,0.72)] backdrop-blur-3xl"
          >

            {/* HEADER */}

            <div className="mb-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4">

              <p className="text-xs uppercase tracking-[0.22em] text-cyan-300/70">

                Flex Settings

              </p>

              <h2 className="mt-2 text-lg font-bold text-white">

                Control Center

              </h2>

            </div>

            {/* ITEMS */}

            <div className="space-y-1">

              {items.map(
                (
                  item,
                  index
                ) => {

                  const Icon =
                    item.icon;

                  return (

                    <motion.button

                      key={index}

                      whileHover={{
                        x: 4,
                      }}

                      whileTap={{
                        scale: 0.98,
                      }}

                      onClick={() =>
                        handleSafeAction(
                          item.action
                        )
                      }

                      className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition-all duration-200 ${
                        item.danger
                          ? "text-red-300 hover:bg-red-500/10"
                          : "text-white/75 hover:bg-white/5 hover:text-white"
                      }`}
                    >

                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                          item.danger
                            ? "bg-red-500/10"
                            : "bg-white/[0.04]"
                        }`}
                      >

                        <Icon
                          size={19}
                        />

                      </div>

                      <div>

                        <p className="text-sm font-medium">

                          {
                            item.label
                          }

                        </p>

                      </div>

                    </motion.button>
                  );
                }
              )}

            </div>

          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}