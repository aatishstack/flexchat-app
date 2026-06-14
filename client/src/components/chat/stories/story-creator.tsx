"use client";

import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ImageIcon,
  Smile,
  Trash2,
  Type,
  X,
  SendHorizonal,
  Loader2,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
} from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { createStory } from "@/services/story.service";
import { uploadMedia } from "@/services/upload.service";
import { useToastStore } from "@/store/toast-store";
import type { Story } from "@/types/story";

// --- Types ---

type StoryTextOverlay = {
  text: string;
  x: number;
  y: number;
  scale: number;
  rotate: number;
  color: string;
  align: "left" | "center" | "right";
  highlight: boolean;
  fontSize: number;
  fontFamily: "Inter" | "Georgia" | "Impact";
};

type StorySticker = {
  label: string;
  x: number;
  y: number;
  scale: number;
  rotate: number;
};

type StoryDraft = {
  file?: File;
  previewUrl?: string;
  mediaType: "image" | "video" | "text";
  caption: string;
  textOverlay?: StoryTextOverlay;
  backgroundColor?: string;
  sticker?: StorySticker;
};

type DraftElementKind = "text" | "sticker";

// --- Constants ---

const TEXT_STORY_MEDIA_URL = "flexchat://story/text";
const STORY_STICKERS = ["WOW", "YES", "LIVE", "MOOD", "FLEX"];
const STORY_TOOL_BUTTON_CLASS =
  "fc-telegram-touch flex h-10 w-10 items-center justify-center text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)] transition active:scale-90 disabled:cursor-not-allowed disabled:opacity-45";

const DEFAULT_STORY_TEXT_OVERLAY: StoryTextOverlay = {
  text: "",
  x: 50,
  y: 50,
  scale: 1,
  rotate: 0,
  color: "#ffffff",
  align: "center",
  highlight: true,
  fontSize: 34,
  fontFamily: "Inter",
};

// --- Components ---

const BackgroundMediaLayer = memo(({
  children,
  canvasRect,
}: {
  children: React.ReactNode;
  canvasRect: DOMRect | null;
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const rotate = useMotionValue(0);

  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastDist = useRef<number | null>(null);
  const lastAngle = useRef<number | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !canvasRect) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const p = Array.from(pointers.current.values());

    if (p.length === 1) {
      x.set(x.get() + e.movementX);
      y.set(y.get() + e.movementY);
    } else if (p.length === 2) {
      const p1 = p[0]!;
      const p2 = p[1]!;
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const angle = Math.atan2(p1.y - p2.y, p1.x - p2.x) * (180 / Math.PI);

      if (lastDist.current !== null) {
        const delta = dist / lastDist.current;
        scale.set(Math.max(0.2, Math.min(6, scale.get() * delta)));
      }
      if (lastAngle.current !== null) {
        const delta = angle - lastAngle.current;
        rotate.set(rotate.get() + delta);
      }
      lastDist.current = dist;
      lastAngle.current = angle;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) {
      lastDist.current = null;
      lastAngle.current = null;
    }
  };

  return (
    <motion.div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        x,
        y,
        scale,
        rotate,
        width: "100%",
        height: "100%",
        transformOrigin: "center",
        touchAction: "none",
      }}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
    >
      {children}
    </motion.div>
  );
});
BackgroundMediaLayer.displayName = "BackgroundMediaLayer";

type EditorLayerProps = {
  initialX: number;
  initialY: number;
  initialScale?: number;
  initialRotation?: number;
  onUpdate: (x: number, y: number, scale: number, rotate: number) => void;
  onSelect: () => void;
  onDragStart: () => void;
  onDragMove: (clientX: number, clientY: number) => void;
  onDragEnd: () => void;
  children: React.ReactNode;
  canvasRect: DOMRect | null;
  isSelected: boolean;
};

const EditorLayer = memo(({
  initialX,
  initialY,
  initialScale = 1,
  initialRotation = 0,
  onUpdate,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  children,
  canvasRect,
  isSelected,
}: EditorLayerProps) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(initialScale);
  const rotate = useMotionValue(initialRotation);

  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastDist = useRef<number | null>(null);
  const lastAngle = useRef<number | null>(null);

  useEffect(() => {
    if (canvasRect) {
      x.set((initialX / 100) * canvasRect.width - canvasRect.width / 2);
      y.set((initialY / 100) * canvasRect.height - canvasRect.height / 2);
    }
  }, [initialX, initialY, canvasRect, x, y]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) onDragStart();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !canvasRect) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const p = Array.from(pointers.current.values());

    if (p.length === 1) {
      onDragMove(e.clientX, e.clientY);
      
      // Center snapping (8px threshold)
      const currentX = x.get();
      const currentY = y.get();
      if (Math.abs(currentX) < 8) x.set(0);
      if (Math.abs(currentY) < 8) y.set(0);

    } else if (p.length === 2) {
      const p1 = p[0]!;
      const p2 = p[1]!;
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const angle = Math.atan2(p1.y - p2.y, p1.x - p2.x) * (180 / Math.PI);

      if (lastDist.current !== null) {
        const delta = dist / lastDist.current;
        scale.set(Math.max(0.4, Math.min(4, scale.get() * delta)));
      }
      if (lastAngle.current !== null) {
        const delta = angle - lastAngle.current;
        rotate.set(rotate.get() + delta);
      }
      lastDist.current = dist;
      lastAngle.current = angle;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) {
      lastDist.current = null;
      lastAngle.current = null;
    }
    if (pointers.current.size === 0) {
      if (canvasRect) {
        const finalX = ((x.get() + canvasRect.width / 2) / canvasRect.width) * 100;
        const finalY = ((y.get() + canvasRect.height / 2) / canvasRect.height) * 100;
        onUpdate(finalX, finalY, scale.get(), rotate.get());
      }
      onDragEnd();
    }
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragStart={onDragStart}
      onDrag={(_, info) => onDragMove(info.point.x, info.point.y)}
      onDragEnd={() => {
        if (canvasRect) {
          const finalX = ((x.get() + canvasRect.width / 2) / canvasRect.width) * 100;
          const finalY = ((y.get() + canvasRect.height / 2) / canvasRect.height) * 100;
          onUpdate(finalX, finalY, scale.get(), rotate.get());
        }
        onDragEnd();
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        x,
        y,
        scale,
        rotate,
        position: "absolute",
        left: "50%",
        top: "50%",
        zIndex: isSelected ? 40 : 30,
        touchAction: "none",
      }}
      className={cn(
        "flex cursor-grab items-center justify-center active:cursor-grabbing",
        isSelected && "ring-2 ring-[#2AABEE] ring-offset-2 ring-offset-transparent rounded-xl p-1"
      )}
    >
      {children}
    </motion.div>
  );
});

EditorLayer.displayName = "EditorLayer";

// --- Main StoryCreator Component ---

type StoryCreatorProps = {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Story["user"] | null | undefined;
};

export const StoryCreator = memo(({ isOpen, onClose, currentUser }: StoryCreatorProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const storyCanvasRef = useRef<HTMLDivElement | null>(null);
  const deleteZoneRef = useRef<HTMLDivElement | null>(null);
  const deleteHoverRef = useRef(false);
  
  const [storyPreparing, setStoryPreparing] = useState(false);
  const [storyComposerOpen, setStoryComposerOpen] = useState(false);
  const [storyDraft, setStoryDraft] = useState<StoryDraft | null>(null);
  const [textOverlayEditorOpen, setTextOverlayEditorOpen] = useState(false);
  const [selectedDraftElement, setSelectedDraftElement] = useState<DraftElementKind | null>(null);
  const [dragDeleteState, setDragDeleteState] = useState<{
    kind: DraftElementKind;
    active: boolean;
    overDelete: boolean;
  } | null>(null);

  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);

  const storyTextColors = useMemo(() => ["#ffffff", "#2AABEE", "#FF3B30", "#4CD964", "#FFCC00"], []);
  const storyBackgroundColors = useMemo(() => ["#2aabee", "#0e1621", "#17212b", "#232e3c"], []);

  const createStoryMutation = useMutation({
    mutationFn: async ({ file, mediaType, caption }: { file?: File; mediaType: string; caption: string }) => {
      if (!currentUser) throw new Error("Sign in to publish a story.");
      if (mediaType === "text" && !caption.trim()) throw new Error("Write something first.");
      if (mediaType !== "text" && !file) throw new Error("Select a photo or video.");

      const uploadedMedia =
        mediaType === "text"
          ? null
          : await uploadMedia(file!, {
              onProgress: () => {},
              purpose: "story",
            });

      return createStory({
        mediaUrl:
          uploadedMedia?.url ??
          TEXT_STORY_MEDIA_URL,
        mediaPublicId:
          uploadedMedia?.publicId,
        mediaType:
          mediaType as
            | "image"
            | "video"
            | "text",
        caption:
          caption.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stories.all });
      pushToast({ title: "Story published", variant: "success" });
      setStoryDraft(null);
      setStoryComposerOpen(false);
      setTextOverlayEditorOpen(false);
      setSelectedDraftElement(null);
      onClose();
    },
    onError: (error: Error) => {
      pushToast({ title: "Could not share story", message: error.message, variant: "error" });
    },
    onSettled: () => {
      setStoryPreparing(false);
    },
  });

  const chooseMediaStory = () => { setStoryComposerOpen(false); fileInputRef.current?.click(); };

  const openStoryPreview = async (file: File) => {
    const mediaType = file.type.startsWith("video/") ? "video" : "image";
    const previewUrl = URL.createObjectURL(file);
    setStoryDraft({ file, previewUrl, mediaType, caption: "" });
    setStoryComposerOpen(false);
  };

  const openTextStoryDraft = () => {
    setStoryDraft({ mediaType: "text", caption: "", backgroundColor: storyBackgroundColors[0] });
    setStoryComposerOpen(false);
    setTextOverlayEditorOpen(true);
  };

  const updateStoryTextOverlay = (updater: (overlay: StoryTextOverlay) => StoryTextOverlay) => {
    setStoryDraft((draft) => {
      if (!draft) return draft;
      const current = draft.textOverlay ?? { ...DEFAULT_STORY_TEXT_OVERLAY, color: storyTextColors[0]! };
      return { ...draft, textOverlay: updater(current) };
    });
  };

  const startDraftElementDrag = (kind: DraftElementKind) => {
    setSelectedDraftElement(kind);
    setDragDeleteState({ kind, active: true, overDelete: false });
  };

  const updateDraftElementDrag = (clientX: number, clientY: number) => {
    if (!dragDeleteState?.active || !deleteZoneRef.current) return;
    const rect = deleteZoneRef.current.getBoundingClientRect();
    const over = clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    if (over !== deleteHoverRef.current) {
      deleteHoverRef.current = over;
      setDragDeleteState((s) => (s ? { ...s, overDelete: over } : s));
    }
  };

  const finishDraftElementDrag = () => {
    const wasOverDelete = deleteHoverRef.current;
    if (wasOverDelete) {
      if (dragDeleteState?.kind === "text") setStoryDraft((d) => (d ? { ...d, textOverlay: undefined } : d));
      else if (dragDeleteState?.kind === "sticker") setStoryDraft((d) => (d ? { ...d, sticker: undefined } : d));
    }
    setDragDeleteState(null);
    deleteHoverRef.current = false;
  };

  const confirmStoryDraftUpload = async () => {
    if (!storyDraft || storyPreparing) return;
    setStoryPreparing(true);
    createStoryMutation.mutate({
      file: storyDraft.file,
      mediaType: storyDraft.mediaType,
      caption: storyDraft.textOverlay?.text || storyDraft.caption,
    });
  };

  useEffect(() => {
    if (!isOpen) {
      setStoryComposerOpen(false);
      setStoryDraft(null);
      setTextOverlayEditorOpen(false);
      setSelectedDraftElement(null);
      setDragDeleteState(null);
      setStoryPreparing(false);
      return;
    }

    if (!storyDraft) {
      setStoryComposerOpen(true);
    }
  }, [isOpen, storyDraft]);

  const openImageTextTool = () => {
    if (!storyDraft?.textOverlay) {
      updateStoryTextOverlay((o) => ({ ...o, text: "" }));
    }
    setTextOverlayEditorOpen(true);
  };

  const closeTextEditor = () => {
    setTextOverlayEditorOpen(false);
    setStoryDraft(draft => {
      if (draft?.textOverlay && !draft.textOverlay.text.trim()) {
        return { ...draft, textOverlay: undefined };
      }
      return draft;
    });
  };

  // Clean up preview URLs on unmount or draft change
  useEffect(() => {
    return () => { if (storyDraft?.previewUrl) URL.revokeObjectURL(storyDraft.previewUrl); };
  }, [storyDraft?.previewUrl]);

  if (!isOpen && !storyDraft && !storyComposerOpen) return null;

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) openStoryPreview(f); }} />

      <AnimatePresence>
        {storyComposerOpen ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[250] flex items-end bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="w-full rounded-t-3xl bg-[#1C242F] px-3 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-3 text-white shadow-2xl" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-white/20" />
              <div className="mb-2 px-3">
                <h3 className="text-[17px] font-semibold tracking-wide">Story</h3>
              </div>
              <div className="grid gap-1">
                <button type="button" onClick={chooseMediaStory} className="fc-telegram-touch flex items-center gap-4 rounded-2xl p-3 transition hover:bg-white/[0.06] active:bg-white/[0.08]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2AABEE] text-white shadow-md shadow-[#2AABEE]/20"><ImageIcon size={18} strokeWidth={2.5} /></span>
                  <span className="text-[16px] font-medium tracking-wide">Gallery</span>
                </button>
                <button type="button" onClick={openTextStoryDraft} className="fc-telegram-touch flex items-center gap-4 rounded-2xl p-3 transition hover:bg-white/[0.06] active:bg-white/[0.08]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E1306C] text-white shadow-md shadow-[#E1306C]/20"><Type size={18} strokeWidth={2.5} /></span>
                  <span className="text-[16px] font-medium tracking-wide">Text</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {storyDraft ? (
        <div className="fixed inset-0 z-[255] flex items-center justify-center bg-black text-white">
          <div
            ref={storyCanvasRef}
            className="relative touch-none overflow-hidden bg-black"
            style={{ aspectRatio: "9 / 16", width: "min(100vw, calc(100dvh * 9 / 16))", height: "min(100dvh, calc(100vw * 16 / 9))" }}
          >
            {storyDraft.mediaType === "text" ? (
              <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${storyDraft.backgroundColor ?? storyBackgroundColors[0]}, #020617)` }} />
            ) : (
              <BackgroundMediaLayer canvasRect={storyCanvasRef.current?.getBoundingClientRect() ?? null}>
                {storyDraft.mediaType === "image" && storyDraft.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={storyDraft.previewUrl} alt="" decoding="async" className="h-full w-full object-cover" draggable={false} />
                ) : storyDraft.mediaType === "video" ? (
                  <video src={storyDraft.previewUrl} autoPlay muted loop playsInline className="h-full w-full object-cover" />
                ) : null}
              </BackgroundMediaLayer>
            )}

            {storyDraft.textOverlay && !textOverlayEditorOpen ? (
              <EditorLayer
                initialX={storyDraft.textOverlay.x}
                initialY={storyDraft.textOverlay.y}
                initialScale={storyDraft.textOverlay.scale}
                initialRotation={storyDraft.textOverlay.rotate}
                canvasRect={storyCanvasRef.current?.getBoundingClientRect() ?? null}
                isSelected={selectedDraftElement === "text"}
                onSelect={() => setSelectedDraftElement("text")}
                onUpdate={(x, y, scale, rotate) => updateStoryTextOverlay((o) => ({ ...o, x, y, scale, rotate }))}
                onDragStart={() => startDraftElementDrag("text")}
                onDragMove={updateDraftElementDrag}
                onDragEnd={finishDraftElementDrag}
              >
                <div 
                  onDoubleClick={() => setTextOverlayEditorOpen(true)}
                  style={{ 
                    color: storyDraft.textOverlay.color, 
                    fontSize: `${storyDraft.textOverlay.fontSize}px`, 
                    fontFamily: storyDraft.textOverlay.fontFamily, 
                    textAlign: storyDraft.textOverlay.align, 
                    background: storyDraft.textOverlay.highlight ? "rgba(0,0,0,0.46)" : "transparent",
                    padding: "8px 16px",
                    borderRadius: "18px",
                    fontWeight: 700,
                    lineHeight: 1.1,
                    maxWidth: "280px",
                  }}
                >
                  {storyDraft.textOverlay.text}
                </div>
              </EditorLayer>
            ) : null}

            {storyDraft.sticker ? (
              <EditorLayer
                initialX={storyDraft.sticker.x}
                initialY={storyDraft.sticker.y}
                initialScale={storyDraft.sticker.scale}
                initialRotation={storyDraft.sticker.rotate}
                canvasRect={storyCanvasRef.current?.getBoundingClientRect() ?? null}
                isSelected={selectedDraftElement === "sticker"}
                onSelect={() => setSelectedDraftElement("sticker")}
                onUpdate={(x, y, scale, rotate) => setStoryDraft(d => d ? { ...d, sticker: { ...d.sticker!, x, y, scale, rotate } } : d)}
                onDragStart={() => startDraftElementDrag("sticker")}
                onDragMove={updateDraftElementDrag}
                onDragEnd={finishDraftElementDrag}
              >
                <div className="text-4xl font-black text-white drop-shadow-lg">{storyDraft.sticker.label}</div>
              </EditorLayer>
            ) : null}
          </div>

          <div className="absolute inset-x-0 top-0 z-[35] flex items-center justify-between bg-gradient-to-b from-black/40 to-transparent p-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
            <button type="button" onClick={() => setStoryDraft(null)} className={STORY_TOOL_BUTTON_CLASS}><X size={24} /></button>
            <div className="flex gap-1">
              <button type="button" onClick={openImageTextTool} className={STORY_TOOL_BUTTON_CLASS}><Type size={22} /></button>
              <button type="button" onClick={() => setStoryDraft(d => d ? { ...d, sticker: { label: STORY_STICKERS[0]!, x: 50, y: 50, scale: 1, rotate: 0 } } : d)} className={STORY_TOOL_BUTTON_CLASS}><Smile size={22} /></button>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-[35] flex items-end gap-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-[max(env(safe-area-inset-bottom),1rem)] pt-12">
            <div className="flex min-h-[44px] flex-1 items-center rounded-full bg-black/30 px-4 backdrop-blur-xl shadow-lg shadow-black/20">
               <input 
                 type="text" 
                 value={storyDraft.caption}
                 onChange={(e) => setStoryDraft(d => d ? { ...d, caption: e.target.value.slice(0, 100) } : d)}
                 placeholder="Add a caption..." 
                 className="w-full bg-transparent text-[15px] tracking-wide text-white outline-none placeholder:text-white/60"
               />
            </div>
            <button 
               type="button" 
               onClick={confirmStoryDraftUpload} 
               disabled={createStoryMutation.isPending} 
               className="fc-telegram-touch flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2AABEE] text-white shadow-lg shadow-[#2AABEE]/20 transition active:scale-95 disabled:opacity-50"
            >
              {createStoryMutation.isPending ? <Loader2 size={20} className="motion-safe:animate-spin" /> : <SendHorizonal size={20} className="ml-0.5" />}
            </button>
          </div>

          <AnimatePresence>
            {dragDeleteState?.active && (
              <motion.div ref={deleteZoneRef} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0, scale: dragDeleteState.overDelete ? 1.2 : 1 }} exit={{ opacity: 0 }} className={cn("absolute bottom-24 left-1/2 -translate-x-1/2 flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/20 bg-black/40 backdrop-blur-xl", dragDeleteState.overDelete && "border-red-500 bg-red-500/20")}>
                <Trash2 size={24} className={dragDeleteState.overDelete ? "text-red-500" : "text-white"} />
              </motion.div>
            )}
          </AnimatePresence>

          {textOverlayEditorOpen && storyDraft.textOverlay && (
            <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 p-6 backdrop-blur-md">
              <textarea autoFocus value={storyDraft.textOverlay.text} onChange={(e) => updateStoryTextOverlay(o => ({ ...o, text: e.target.value }))} className="w-full resize-none border-0 bg-transparent text-center text-3xl font-bold text-white outline-none" />
              <button type="button" onClick={closeTextEditor} className="mt-8 rounded-full bg-[#2AABEE] px-6 py-2 font-bold">Done</button>
            </div>
          )}
        </div>
      ) : null}
    </>
  );
});

StoryCreator.displayName = "StoryCreator";
