interface Props {
  name: string;

  lastMessage: string;

  unreadCount: number;

  online: boolean;

  active: boolean;

  onClick: () => void;
}

export const ConversationItem = ({
  name,
  lastMessage,
  unreadCount,
  online,
  active,
  onClick,
}: Props) => {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${
        active
          ? "bg-purple-600/20"
          : "hover:bg-white/5"
      }`}
    >
      <div className="relative">
        
        <div className="h-12 w-12 rounded-full bg-purple-500" />

        <div
          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#15151d] ${
            online
              ? "bg-green-400"
              : "bg-zinc-500"
          }`}
        />
      </div>

      <div className="min-w-0 flex-1">
        
        <div className="flex items-center justify-between">
          
          <h2 className="truncate font-medium">
            {name}
          </h2>

          {unreadCount > 0 && (
            <div className="flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-500 px-1 text-[10px] font-bold text-white">
              {unreadCount}
            </div>
          )}
        </div>

        <p className="truncate text-sm text-white/40">
          {lastMessage}
        </p>
      </div>
    </button>
  );
};