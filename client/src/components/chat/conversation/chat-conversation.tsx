"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Mic,
  SendHorizonal,
  Phone,
  Video,
  MoreVertical,
  Reply,
  ImageIcon,
  Play,
  Pause,
} from "lucide-react";

import { motion } from "framer-motion";

import { useDropzone } from "react-dropzone";

import { getMessages } from "@/services/message.service";

import { uploadImage } from "@/services/upload.service";

import { useAuthStore } from "@/stores/auth.store";

import { useSocketStore } from "@/store/socket-store";

import { useConversationStore } from "@/stores/conversation.store";

export default function ChatConversation() {
  const [text, setText] =
    useState("");

  const [replyingTo, setReplyingTo] =
    useState<any>(null);

  const [previewImage, setPreviewImage] =
    useState<string | null>(
      null
    );

  const [uploading, setUploading] =
    useState(false);

  const [recording, setRecording] =
    useState(false);

  const [audioUrl, setAudioUrl] =
    useState<string | null>(
      null
    );

  const [playingAudio, setPlayingAudio] =
    useState<string | null>(
      null
    );

  const [selectedReaction, setSelectedReaction] =
    useState<{
      [key: string]: string;
    }>({});

  const [pinnedMessage, setPinnedMessage] =
    useState<any>(null);

  const [searchOpen, setSearchOpen] =
    useState(false);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [commandOpen, setCommandOpen] =
    useState(false);

  const [galleryOpen, setGalleryOpen] =
    useState(false);

  const [previewMedia, setPreviewMedia] =
    useState<string | null>(
      null
    );

  const reactionEmojis = [
    "❤️",
    "🔥",
    "😂",
    "👍",
    "😮",
  ];

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(
      null
    );

  const audioChunksRef =
    useRef<Blob[]>([]);

  const bottomRef =
    useRef<HTMLDivElement>(
      null
    );

  const user =
    useAuthStore(
      (state) => state.user
    );

  const activeConversation =
    useConversationStore(
      (state) =>
        state.activeConversation
    );

  const messages =
    useSocketStore(
      (state) =>
        state.messages
    );

  const filteredMessages =
    messages.filter(
      (message) =>
        message.text
          ?.toLowerCase()
          .includes(
            searchQuery.toLowerCase()
          )
    );

  const mediaMessages =
    messages.filter(
      (message) =>
        message.attachment
    );

  const audioMessages =
    messages.filter(
      (message) =>
        message.audio
    );

  const onlineUsers =
    useSocketStore(
      (state) =>
        state.onlineUsers
    );

  const typingUsers =
    useSocketStore(
      (state) =>
        state.typingUsers
    );

  const setMessages =
    useSocketStore(
      (state) =>
        state.setMessages
    );

  const joinConversation =
    useSocketStore(
      (state) =>
        state.joinConversation
    );

  const sendMessage =
    useSocketStore(
      (state) =>
        state.sendMessage
    );

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setCommandOpen(
          false
        );

        setSearchOpen(
          false
        );

        setGalleryOpen(
          false
        );

        setPreviewMedia(
          null
        );
      }

      if (
        (
          event.ctrlKey ||
          event.metaKey
        ) &&
        event.key === "k"
      ) {
        event.preventDefault();

        setCommandOpen(
          (
            prev
          ) => !prev
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

  async function handleUpload(
    file: File
  ) {
    try {
      setUploading(true);

      const url =
        await uploadImage(
          file
        );

      setPreviewImage(
        url
      );
    } catch (
      error
    ) {
      console.error(
        error
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleRecording() {
    try {
      if (
        recording
      ) {
        mediaRecorderRef.current?.stop();

        setRecording(
          false
        );

        return;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
          }
        );

      const mediaRecorder =
        new MediaRecorder(
          stream
        );

      mediaRecorderRef.current =
        mediaRecorder;

      audioChunksRef.current =
        [];

      mediaRecorder.ondataavailable =
        (
          event
        ) => {
          audioChunksRef.current.push(
            event.data
          );
        };

      mediaRecorder.onstop =
        async () => {
          const audioBlob =
            new Blob(
              audioChunksRef.current,
              {
                type:
                  "audio/webm",
              }
            );

          const audioFile =
            new File(
              [audioBlob],
              `voice-${Date.now()}.webm`,
              {
                type:
                  "audio/webm",
              }
            );

          const uploadedAudio =
            await uploadImage(
              audioFile
            );

          setAudioUrl(
            uploadedAudio
          );
        };

      mediaRecorder.start();

      setRecording(
        true
      );
    } catch (
      error
    ) {
      console.error(
        error
      );
    }
  }

  const {
    getRootProps,
    getInputProps,
  } = useDropzone({
    accept: {
      "image/*": [],
    },

    multiple: false,

    onDrop: async (
      files
    ) => {
      const file =
        files[0];

      if (!file) {
        return;
      }

      await handleUpload(
        file
      );
    },
  });

  useEffect(() => {
    if (
      !activeConversation
    ) {
      return;
    }

    const conversationId =
      activeConversation.id;

    async function loadHistory() {
      try {
        joinConversation(
          conversationId
        );

        const history =
          await getMessages(
            conversationId
          );

        setMessages(
          history as any
        );
      } catch (
        error
      ) {
        console.error(
          error
        );
      }
    }

    loadHistory();
  }, [
    activeConversation,
    joinConversation,
    setMessages,
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView(
      {
        behavior:
          "smooth",
      }
    );
  }, [messages]);

  function handleSend() {
    if (
      !text.trim() &&
      !previewImage &&
      !audioUrl
    ) {
      return;
    }

    if (
      !activeConversation
    ) {
      return;
    }

    sendMessage({
      conversationId:
        activeConversation.id,

      text,

      attachment:
        previewImage,

      audio:
        audioUrl,

      replyTo:
        replyingTo
          ? {
              id:
                replyingTo.id,

              text:
                replyingTo.text,
            }
          : undefined,
    });

    setReplyingTo(null);

    setPreviewImage(
      null
    );

    setAudioUrl(
      null
    );

    setText("");
  }

  const online =
    onlineUsers.length > 0;

  if (
    !activeConversation
  ) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#070B14] text-zinc-500">
        No conversation selected
      </div>
    );
  }

  return (
    <section className="relative flex flex-1 flex-col overflow-hidden bg-[#070B14]">
      {previewMedia && (
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/90 p-10">
          <button
            onClick={() =>
              setPreviewMedia(
                null
              )
            }
            className="absolute right-6 top-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-white"
          >
            ✕
          </button>

          <img
            src={previewMedia}
            alt=""
            className="max-h-full max-w-full rounded-3xl object-contain"
          />
        </div>
      )}

      {commandOpen && (
        <div className="absolute inset-0 z-[60] flex items-start justify-center bg-black/60 pt-32 backdrop-blur-xl">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#111827] p-4 shadow-2xl">
            <div className="mb-4 flex items-center rounded-2xl border border-white/10 bg-white/[0.04] px-4">
              <input
                autoFocus
                placeholder="Search commands..."
                className="h-14 flex-1 bg-transparent text-white outline-none placeholder:text-zinc-500"
              />

              <kbd className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs text-zinc-400">
                ESC
              </kbd>
            </div>

            <div className="space-y-2">
              {[
                {
                  label:
                    "New Group",
                },

                {
                  label:
                    "Search Messages",
                },

                {
                  label:
                    "Mute Conversation",
                },

                {
                  label:
                    "Pinned Messages",
                },

                {
                  label:
                    "Media Gallery",

                  action: () => {
                    setGalleryOpen(
                      true
                    );

                    setCommandOpen(
                      false
                    );
                  },
                },
              ].map(
                (
                  item
                ) => (
                  <button
                    key={
                      item.label
                    }
                    onClick={
                      item.action
                    }
                    className="flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left text-white transition-all hover:bg-white/[0.05]"
                  >
                    <span>
                      {
                        item.label
                      }
                    </span>

                    <span className="text-xs text-zinc-500">
                      ↵
                    </span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {galleryOpen && (
        <div className="absolute inset-0 z-[70] bg-[#070B14]">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Shared Media
              </h2>

              <p className="text-sm text-zinc-500">
                {
                  mediaMessages.length
                }{" "}
                photos •{" "}
                {
                  audioMessages.length
                }{" "}
                voice notes
              </p>
            </div>

            <button
              onClick={() =>
                setGalleryOpen(
                  false
                )
              }
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 p-6 md:grid-cols-4">
            {mediaMessages.map(
              (
                message
              ) => (
                <button
                  key={
                    message.id
                  }
                  onClick={() =>
                    setPreviewMedia(
                      message.attachment ||
                        null
                    )
                  }
                  className="overflow-hidden rounded-3xl"
                >
                  <img
                    src={
                      message.attachment
                    }
                    alt=""
                    className="h-52 w-full object-cover transition-all hover:scale-105"
                  />
                </button>
              )
            )}
          </div>
        </div>
      )}

      {searchOpen && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xl">
          <div className="mx-auto mt-24 w-full max-w-2xl rounded-3xl border border-white/10 bg-[#111827] p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(
                    e.target.value
                  )
                }
                placeholder="Search messages..."
                className="h-14 flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-white outline-none placeholder:text-zinc-500"
              />

              <button
                onClick={() =>
                  setSearchOpen(
                    false
                  )
                }
                className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 max-h-[500px] space-y-3 overflow-y-auto">
              {filteredMessages.map(
                (
                  message
                ) => (
                  <div
                    key={
                      message.id
                    }
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <p className="line-clamp-2 text-sm text-white/80">
                      {message.text ||
                        "Media"}
                    </p>
                  </div>
                )
              )}

              {!filteredMessages.length && (
                <div className="py-10 text-center text-zinc-500">
                  No results found
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}