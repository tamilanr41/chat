'use client';

import { motion } from 'framer-motion';

interface MessageInfoProps {
  readBy: string[];
  deliveredTo: string[];
  partnerName: string;
  sentAt: string;
  onClose: () => void;
}

export default function MessageInfo({ readBy, deliveredTo, partnerName, sentAt, onClose }: MessageInfoProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="glass rounded-3xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-display gradient-text text-center mb-4">Message Info</h3>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm">🕐</span>
            <div>
              <p className="text-xs text-white/40">Sent</p>
              <p className="text-sm text-white/70">
                {new Date(sentAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm">✅</span>
            <div>
              <p className="text-xs text-white/40">Delivered to</p>
              <p className="text-sm text-white/70">{partnerName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm">{readBy.length > 0 ? '👁️' : '👁️‍🗨️'}</span>
            <div>
              <p className="text-xs text-white/40">Read by</p>
              {readBy.length > 0 ? (
                <p className="text-sm text-green-400">{partnerName}</p>
              ) : (
                <p className="text-sm text-white/30">Not read yet</p>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-2 rounded-xl glass text-sm text-white/50 hover:bg-white/5"
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}
