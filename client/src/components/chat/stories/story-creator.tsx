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
import { uploadImage } from "@/services/upload.service";
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
  "fc-telegram-touch flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45";

const DEFAULT_STORY_TEXT_OVERLAY: StoryTextOverlay = {
  text: "Tap to edit",
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
      onDrag={(e) => onDragMove(e.clientX, e.clientY)}
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

      const mediaUrl = mediaType === "text" 
        ? TEXT_STORY_MEDIA_URL 
        : await uploadImage(file!, { onProgress: () => {} });

      return createStory({ mediaUrl, mediaType: mediaType as "image" | "video" | "text", caption: caption.trim() || undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stories.all });
      pushToast({ title: "Story published", variant: "success" });
      onClose();
    },
    onError: (error: Error) => {
      pushToast({ title: "Could not share story", message: error.message, variant: "error" });
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
    if (isOpen && !storyDraft) setStoryComposerOpen(true);
  }, [isOpen, storyDraft]);

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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[250] flex items-end bg-black/60 px-3 py-6 backdrop-blur-md sm:items-center sm:justify-center" onClick={onClose}>
            <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0E1621]/95 p-3 text-white" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-2">
                <h3 className="text-sm font-semibold">Create story</h3>
                <button type="button" onClick={onClose} className="p-2 text-zinc-400 hover:text-white"><X size={18} /></button>
              </div>
              <div className="grid gap-2 p-1">
                <button type="button" onClick={chooseMediaStory} className="flex items-center gap-3 rounded-2xl p-3 hover:bg-white/[0.07]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2AABEE]/15 text-[#75CFF6]"><ImageIcon size={19} /></span>
                  <span className="text-sm font-medium">Photo or video</span>
                </button>
                <button type="button" onClick={openTextStoryDraft} className="flex items-center gap-3 rounded-2xl p-3 hover:bg-white/[0.07]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E1306C]/15 text-[#FF8FB5]"><Type size={19} /></span>
                  <span className="text-sm font-medium">Text story</span>
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
            {storyDraft.mediaType === "image" && storyDraft.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={storyDraft.previewUrl} alt="" className="h-full w-full object-cover" />
            ) : storyDraft.mediaType === "video" ? (
              <video src={storyDraft.previewUrl} autoPlay muted loop playsInline className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${storyDraft.backgroundColor ?? storyBackgroundColors[0]}, #020617)` }} />
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

          <div className="absolute inset-x-0 top-0 z-[35] flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-4 pt-[calc(1rem+env(safe-area-inset-top))]">
            <button type="button" onClick={() => setStoryDraft(null)} className={STORY_TOOL_BUTTON_CLASS}><X size={22} /></button>
            <div className="flex gap-2">
              <button type="button" onClick={() => updateStoryTextOverlay(o => o)} className={STORY_TOOL_BUTTON_CLASS}><Type size={21} /></button>
              <button type="button" onClick={() => setStoryDraft(d => d ? { ...d, sticker: { label: STORY_STICKERS[0]!, x: 50, y: 50, scale: 1, rotate: 0 } } : d)} className={STORY_TOOL_BUTTON_CLASS}><Smile size={21} /></button>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-[35] p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-black/60 to-transparent">
             <button type="button" onClick={confirmStoryDraftUpload} disabled={createStoryMutation.isPending} className="h-11 w-full rounded-full bg-[#2AABEE] text-[15px] font-medium tracking-wide text-white shadow-lg shadow-[#2AABEE]/20 active:scale-[0.98] transition-transform disabled:opacity-50">
               {createStoryMutation.isPending ? "Sharing..." : "Share to Story"}
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
              <button type="button" onClick={() => setTextOverlayEditorOpen(false)} className="mt-8 rounded-full bg-[#2AABEE] px-6 py-2 font-bold">Done</button>
            </div>
          )}
        </div>
      ) : null}
    </>
  );
});

StoryCreator.displayName = "StoryCreator";
