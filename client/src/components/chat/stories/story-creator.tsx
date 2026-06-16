"use client";

import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  ImageIcon,
  Loader2,
  Lock,
  SendHorizontal,
  Type,
  Users,
  X,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { createStory } from "@/services/story.service";
import {
  getUploadMediaKind,
  getUploadValidationError,
  uploadMedia,
} from "@/services/upload.service";
import { useToastStore } from "@/store/toast-store";
import type {
  Story,
  StoryMediaType,
  StoryVisibility,
} from "@/types/story";

const TEXT_STORY_MEDIA_URL = "flexchat://story/text";

type StoryDraft = {
  file?: File;
  mediaType: StoryMediaType;
  previewUrl?: string;
  caption: string;
};

type StoryCreatorProps = {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Story["user"] | null | undefined;
};

function visibilityLabel(visibility: StoryVisibility) {
  return visibility === "contacts" ? "My contacts" : "Only me";
}

export const StoryCreator = memo(function StoryCreator({
  isOpen,
  onClose,
  currentUser,
}: StoryCreatorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState<StoryDraft | null>(null);
  const [visibility, setVisibility] =
    useState<StoryVisibility>("contacts");
  const [uploadProgress, setUploadProgress] = useState(0);
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);

  const createStoryMutation = useMutation({
    mutationFn: async ({
      activeDraft,
      audience,
    }: {
      activeDraft: StoryDraft;
      audience: StoryVisibility;
    }) => {
      if (!currentUser) {
        throw new Error("Sign in to publish a status.");
      }

      if (
        activeDraft.mediaType === "text" &&
        !activeDraft.caption.trim()
      ) {
        throw new Error("Write a status first.");
      }

      const uploadedMedia =
        activeDraft.mediaType === "text"
          ? null
          : await uploadMedia(activeDraft.file!, {
              purpose: "story",
              onProgress: setUploadProgress,
            });

      return createStory({
        mediaUrl: uploadedMedia?.url ?? TEXT_STORY_MEDIA_URL,
        mediaPublicId: uploadedMedia?.publicId,
        mediaType: activeDraft.mediaType,
        visibility: audience,
        caption: activeDraft.caption.trim() || undefined,
      });
    },
    onSuccess: (story) => {
      queryClient.setQueryData<Story[]>(
        queryKeys.stories.all,
        (stories) => {
          const current = stories ?? [];

          return current.some((item) => item.id === story.id)
            ? current
            : [story, ...current];
        },
      );
      resetAndClose();
      pushToast({
        title: "Status published",
        message: `Visible to ${visibilityLabel(story.visibility).toLowerCase()}.`,
        variant: "success",
      });
    },
    onError: (error: Error) => {
      setUploadProgress(0);
      pushToast({
        title: "Could not publish status",
        message: error.message,
        variant: "error",
      });
    },
  });

  function resetAndClose() {
    setDraft(null);
    setVisibility("contacts");
    setUploadProgress(0);
    onClose();
  }

  function chooseMedia() {
    fileInputRef.current?.click();
  }

  function openMediaDraft(file: File) {
    const validationError = getUploadValidationError(file);
    const mediaKind = getUploadMediaKind(file);

    if (validationError) {
      pushToast({
        title: "Cannot use this file",
        message: validationError,
        variant: "error",
      });
      return;
    }

    if (mediaKind !== "image" && mediaKind !== "video") {
      pushToast({
        title: "Unsupported file",
        message: "Choose an image or video.",
        variant: "error",
      });
      return;
    }

    setDraft({
      file,
      mediaType: mediaKind,
      previewUrl: URL.createObjectURL(file),
      caption: "",
    });
  }

  function openTextDraft() {
    setDraft({
      mediaType: "text",
      caption: "",
    });
  }

  useEffect(() => {
    const previewUrl = draft?.previewUrl;

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [draft?.previewUrl]);

  useEffect(() => {
    if (!isOpen) {
      setDraft(null);
      setVisibility("contacts");
      setUploadProgress(0);
    }
  }, [isOpen]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";

          if (file) {
            openMediaDraft(file);
          }
        }}
      />

      {isOpen && !draft ? (
        <div
          className="fixed inset-0 z-[250] flex items-end bg-black/75"
          onClick={resetAndClose}
        >
          <div
            className="w-full border-t border-white/[0.08] bg-[#0A0A0A] px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 sm:mx-auto sm:mb-6 sm:max-w-md sm:rounded-2xl sm:border"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-white/15" />
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">
                  New status
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Updates disappear after 24 hours.
                </p>
              </div>
              <button
                type="button"
                onClick={resetAndClose}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/[0.06]"
                aria-label="Close status creator"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={chooseMedia}
                className="fc-telegram-touch flex min-h-24 flex-col items-start justify-between rounded-2xl border border-white/[0.08] bg-[#111111] p-4 text-left transition-colors hover:bg-[#161616]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7C3AED] text-white">
                  <ImageIcon size={17} />
                </span>
                <span className="text-sm font-medium text-zinc-200">
                  Photo or video
                </span>
              </button>

              <button
                type="button"
                onClick={openTextDraft}
                className="fc-telegram-touch flex min-h-24 flex-col items-start justify-between rounded-2xl border border-white/[0.08] bg-[#111111] p-4 text-left transition-colors hover:bg-[#161616]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.08] text-zinc-200">
                  <Type size={17} />
                </span>
                <span className="text-sm font-medium text-zinc-200">
                  Text update
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isOpen && draft ? (
        <div className="fixed inset-0 z-[255] flex flex-col bg-black text-white">
          <header className="flex items-center justify-between px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
            <button
              type="button"
              onClick={() => setDraft(null)}
              disabled={createStoryMutation.isPending}
              className="fc-telegram-touch flex h-10 w-10 items-center justify-center rounded-xl bg-[#111111] text-zinc-300 disabled:opacity-40"
              aria-label="Back"
            >
              <X size={19} />
            </button>
            <p className="text-sm font-medium text-zinc-300">
              Status preview
            </p>
            <div className="h-10 w-10" />
          </header>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            {draft.mediaType === "text" ? (
              <div className="flex h-full items-center justify-center bg-[#111111] px-6">
                <textarea
                  autoFocus
                  value={draft.caption}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            caption: event.target.value.slice(0, 220),
                          }
                        : current,
                    )
                  }
                  maxLength={220}
                  placeholder="Share a brief update"
                  className="max-h-[60dvh] w-full max-w-xl resize-none bg-transparent text-center text-2xl font-semibold leading-snug text-white outline-none placeholder:text-zinc-600 sm:text-3xl"
                />
              </div>
            ) : draft.mediaType === "video" ? (
              <video
                src={draft.previewUrl}
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draft.previewUrl}
                alt=""
                className="h-full w-full object-contain"
              />
            )}

            {createStoryMutation.isPending ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                <Loader2
                  size={24}
                  className="motion-safe:animate-spin"
                />
                <p className="mt-3 text-sm text-zinc-300">
                  {uploadProgress > 0
                    ? `Uploading ${uploadProgress}%`
                    : "Publishing status"}
                </p>
              </div>
            ) : null}
          </div>

          <div className="border-t border-white/[0.08] bg-[#0A0A0A] px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3">
            {draft.mediaType !== "text" ? (
              <input
                type="text"
                value={draft.caption}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          caption: event.target.value.slice(0, 220),
                        }
                      : current,
                  )
                }
                maxLength={220}
                placeholder="Add a caption"
                className="mb-3 h-11 w-full rounded-xl border border-white/[0.08] bg-[#111111] px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#7C3AED]/60"
              />
            ) : null}

            <div className="flex items-center gap-2">
              {(["contacts", "only_me"] as const).map((option) => {
                const selected = visibility === option;
                const Icon = option === "contacts" ? Users : Lock;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setVisibility(option)}
                    disabled={createStoryMutation.isPending}
                    className={`fc-telegram-touch flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors ${
                      selected
                        ? "border-[#7C3AED]/60 bg-[#7C3AED]/15 text-[#C4B5FD]"
                        : "border-white/[0.08] bg-[#111111] text-zinc-400"
                    }`}
                  >
                    <Icon size={15} />
                    {visibilityLabel(option)}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() =>
                  createStoryMutation.mutate({
                    activeDraft: draft,
                    audience: visibility,
                  })
                }
                disabled={
                  createStoryMutation.isPending ||
                  (draft.mediaType === "text" && !draft.caption.trim())
                }
                className="fc-telegram-touch flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED] text-white transition-colors hover:bg-[#8B5CF6] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Publish status"
              >
                <SendHorizontal size={17} />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>,
    document.body,
  );
});

StoryCreator.displayName = "StoryCreator";
