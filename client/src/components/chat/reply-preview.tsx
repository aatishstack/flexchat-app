"use client";

import {
  X,
  Reply,
  Pin,
} from "lucide-react";

import { motion } from "framer-motion";

import { useReplyStore } from "@/store/reply.store";

export const ReplyPreview = () => {
  const replyingTo =
    useReplyStore(
      (state) => state.replyingTo
    );

  const setReplyingTo =
    useReplyStore(
      (state) =>
        state.setReplyingTo
    );

  if (!replyingTo) {
    return null;
  }

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="mb-3 overflow-hidden rounded-2xl border border-purple-500/20 bg-purple-500/10"
    >
      
      <div className="flex items-center justify-between px-4 py-3">
        
        <div className="flex items-start gap-3">
          
          <div className="mt-1 rounded-lg bg-purple-500/20 p-2">
            <Reply
              size={14}
              className="text-purple-300"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              
              <p className="text-xs font-medium text-purple-300">
                Replying to
              </p>

              <div className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] text-yellow-300">
                
                <Pin size={10} />

                Pinned
              </div>
            </div>

            <p className="max-w-[220px] truncate text-sm text-white/80">
              {replyingTo}
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            setReplyingTo(null)
          }
          className="rounded-xl p-2 transition hover:bg-white/10"
        >
          <X size={18} />
        </button>
      </div>
    </motion.div>
  );
};