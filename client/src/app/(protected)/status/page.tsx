"use client";

import { useMemo, useState } from "react";
import { Plus, Search, MoreHorizontal, Camera } from "lucide-react";
import { useStoriesQuery } from "@/hooks/queries/use-stories-query";
import { useAuthStore } from "@/stores/auth.store";
import { groupActiveStories } from "@/components/chat/stories/story-logic";
import { getServerNow } from "@/lib/server-time";
import { formatDisplayName } from "@/lib/user-display";
import FlexAvatar from "@/components/chat/flex-avatar";
import StoryViewer from "@/components/chat/stories/story-viewer";
import { StoryCreator } from "@/components/chat/stories/story-creator";
import { cn } from "@/lib/utils";

export default function StatusPage() {
  const [viewerGroupIndex, setViewerGroupIndex] = useState<number | null>(null);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const currentUser = useAuthStore((state) => state.user);
  const storiesQuery = useStoriesQuery();

  const storyGroups = useMemo(
    () =>
      groupActiveStories(
        storiesQuery.data ?? [],
        currentUser?.id,
        getServerNow(),
      ),
    [currentUser?.id, storiesQuery.data],
  );

  const currentUserGroupIndex = storyGroups.findIndex(
    (group) => group.userId === currentUser?.id,
  );
  const currentUserGroup =
    currentUserGroupIndex >= 0 ? storyGroups[currentUserGroupIndex] : null;
  
  const recentUpdates = storyGroups.filter(
    (group) => group.userId !== currentUser?.id && group.hasUnseen
  );
  
  const viewedUpdates = storyGroups.filter(
    (group) => group.userId !== currentUser?.id && !group.hasUnseen
  );

  const viewerGroup = viewerGroupIndex === null ? null : (storyGroups[viewerGroupIndex] ?? null);

  return (
    <main className="min-h-dvh bg-[#0C0C10] pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[calc(0.5rem+env(safe-area-inset-top))]">
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[28px] font-extrabold tracking-tight text-white">
            Status
          </h1>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.05] text-white">
            <MoreHorizontal size={20} />
          </button>
        </div>

        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
          />
          <input
            placeholder="Search status"
            className="h-11 w-full rounded-[18px] bg-white/[0.04] pl-11 pr-4 text-[15px] font-medium text-white outline-none transition-all placeholder:text-white/30 focus:bg-white/[0.06]"
          />
        </div>
      </div>

      <div className="space-y-6">
        {/* My Status Section */}
        <section className="px-5">
          <button
            onClick={() => {
              if (currentUserGroupIndex >= 0) {
                setViewerGroupIndex(currentUserGroupIndex);
              } else {
                setIsCreatorOpen(true);
              }
            }}
            className="flex items-center gap-4 w-full p-1"
          >
            <div className="relative shrink-0">
              <div className={cn(
                "flex h-[60px] w-[60px] items-center justify-center rounded-full p-[2.5px]",
                currentUserGroup?.hasUnseen 
                  ? "bg-gradient-to-tr from-[#7C4FF0] to-[#A78BFA]" 
                  : "bg-white/10"
              )}>
                <div className="h-full w-full rounded-full ring-2 ring-[#0C0C10] overflow-hidden bg-[#16161D]">
                  <FlexAvatar
                    src={currentUser?.avatar}
                    name={currentUser?.username}
                    className="h-full w-full text-[16px] font-bold"
                  />
                </div>
              </div>
              {!currentUserGroup && (
                <div className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-[#7C4FF0] border-2 border-[#0C0C10] flex items-center justify-center text-white">
                  <Plus size={12} strokeWidth={4} />
                </div>
              )}
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-[16px] font-bold text-white">My Status</h3>
              <p className="text-[13px] text-white/40 font-medium">
                {currentUserGroup ? "Tap to view your status" : "Tap to add status update"}
              </p>
            </div>
          </button>
        </section>

        {/* Recent Updates */}
        {recentUpdates.length > 0 && (
          <section>
            <div className="px-5 mb-3">
              <span className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-white/28">Recent Updates</span>
            </div>
            <div className="px-2">
              {recentUpdates.map((group) => {
                const groupIndex = storyGroups.findIndex(g => g.userId === group.userId);
                return (
                  <button
                    key={group.userId}
                    onClick={() => setViewerGroupIndex(groupIndex)}
                    className="flex items-center gap-4 w-full px-3 py-2.5 rounded-2xl hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="shrink-0 flex h-[58px] w-[58px] items-center justify-center rounded-full p-[2.5px] bg-gradient-to-tr from-[#7C4FF0] to-[#A78BFA]">
                      <div className="h-full w-full rounded-full ring-2 ring-[#0C0C10] overflow-hidden bg-[#16161D]">
                        <FlexAvatar
                          src={group.user.avatar}
                          name={group.user.username}
                          className="h-full w-full text-[16px] font-bold"
                        />
                      </div>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <h3 className="text-[15.5px] font-bold text-white truncate">
                        {formatDisplayName(group.user.username)}
                      </h3>
                      <p className="text-[12.5px] text-white/40 font-medium">
                        Just now
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Viewed Updates */}
        {viewedUpdates.length > 0 && (
          <section>
            <div className="px-5 mb-3">
              <span className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-white/28">Viewed Updates</span>
            </div>
            <div className="px-2">
              {viewedUpdates.map((group) => {
                const groupIndex = storyGroups.findIndex(g => g.userId === group.userId);
                return (
                  <button
                    key={group.userId}
                    onClick={() => setViewerGroupIndex(groupIndex)}
                    className="flex items-center gap-4 w-full px-3 py-2.5 rounded-2xl hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="shrink-0 flex h-[58px] w-[58px] items-center justify-center rounded-full p-[2.5px] bg-white/10">
                      <div className="h-full w-full rounded-full ring-2 ring-[#0C0C10] overflow-hidden bg-[#16161D]">
                        <FlexAvatar
                          src={group.user.avatar}
                          name={group.user.username}
                          className="h-full w-full text-[16px] font-bold opacity-60"
                        />
                      </div>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <h3 className="text-[15.5px] font-bold text-white/60 truncate">
                        {formatDisplayName(group.user.username)}
                      </h3>
                      <p className="text-[12.5px] text-white/30 font-medium">
                        Yesterday
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Floating Action Buttons for Status */}
      <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-6 flex flex-col gap-3">
        <button 
          onClick={() => setIsCreatorOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white/60 shadow-lg backdrop-blur-xl border border-white/10"
        >
          <Camera size={20} />
        </button>
        <button 
          onClick={() => setIsCreatorOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#7C4FF0] text-white shadow-xl shadow-[#7C4FF0]/30"
        >
          <Plus size={24} strokeWidth={3} />
        </button>
      </div>

      <StoryCreator
        isOpen={isCreatorOpen}
        onClose={() => setIsCreatorOpen(false)}
        currentUser={currentUser}
      />

      <StoryViewer
        group={viewerGroup}
        groups={storyGroups}
        groupIndex={viewerGroupIndex}
        onGroupIndexChange={setViewerGroupIndex}
        onClose={() => setViewerGroupIndex(null)}
      />
    </main>
  );
}

