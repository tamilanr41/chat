'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface IncomingCallModalProps {
  callerName: string;
  callerAvatar: string;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallModal({
  callerName,
  callerAvatar,
  callType,
  onAccept,
  onReject,
}: IncomingCallModalProps) {
  const API_BASE = 'https://chat-back-ac0h.onrender.com';
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [ringCount, setRingCount] = useState(0);

  useEffect(() => {
    try {
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczIj2NysijaS0eVJ3N2rBnMyI+jcrIo2ksIFKdzdqwaDMiPo3KyKNpLCBSnc3asGczIj6NysijaSwgUp3N2rBoMyI+jcrIo2k=');
      audioRef.current.loop = true;
      audioRef.current.volume = 0.3;
      audioRef.current.play().catch(() => {});
    } catch {}

    const timer = setInterval(() => {
      setRingCount((c) => c + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleReject = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onReject();
  };

  const handleAccept = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onAccept();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center"
      >
        {/* Pulsing rings */}
        <div className="relative mb-8">
          <motion.div
            animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
            className="absolute inset-0 w-32 h-32 sm:w-40 sm:h-40 rounded-full border-2 border-primary/40 -m-4"
          />
          <motion.div
            animate={{ scale: [1, 1.4], opacity: [0.4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
            className="absolute inset-0 w-32 h-32 sm:w-40 sm:h-40 rounded-full border-2 border-accent/40 -m-4"
          />
          <motion.div
            animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.6 }}
            className="absolute inset-0 w-32 h-32 sm:w-40 sm:h-40 rounded-full border border-primary/20 -m-4"
          />

          {/* Avatar */}
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-romantic-gradient flex items-center justify-center text-6xl shadow-glow overflow-hidden"
          >
            {callerAvatar ? (
              <img src={`${API_BASE}${callerAvatar}`} alt="" className="w-full h-full object-cover" />
            ) : (
              '💕'
            )}
          </motion.div>
        </div>

        {/* Call info */}
        <h2 className="text-2xl font-display gradient-text mb-2">{callerName}</h2>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{callType === 'video' ? '📹' : '📞'}</span>
          <span className="text-sm text-white/60">
            {callType === 'video' ? 'Video Call' : 'Voice Call'}
          </span>
        </div>
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-xs text-white/40 mb-12"
        >
          Incoming call...
        </motion.p>

        {/* Accept / Reject buttons */}
        <div className="flex gap-16 items-center">
          {/* Reject */}
          <div className="flex flex-col items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleReject}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-500/30 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-7 h-7 rotate-[135deg]">
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                <line x1="22" y1="2" x2="2" y2="22" />
              </svg>
            </motion.button>
            <span className="text-[10px] text-white/40">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              onClick={handleAccept}
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white shadow-lg shadow-green-500/30 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-7 h-7">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </motion.button>
            <span className="text-[10px] text-white/40">Accept</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
