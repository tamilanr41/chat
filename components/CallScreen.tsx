'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CallScreenProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callType: 'audio' | 'video';
  callDuration: number;
  isMuted: boolean;
  isVideoOff: boolean;
  partnerName: string;
  partnerAvatar: string;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function RemoteAudio({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);
  return <audio ref={ref} autoPlay playsInline />;
}

function VideoStream({ stream, muted, label }: { stream: MediaStream | null; muted?: boolean; label?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative w-full h-full">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className="w-full h-full object-cover"
        style={muted ? { transform: 'scaleX(-1)' } : undefined}
      />
      {label && (
        <span className="absolute bottom-4 left-4 text-xs text-white/60 bg-black/30 px-2 py-1 rounded-lg backdrop-blur-sm">
          {label}
        </span>
      )}
    </div>
  );
}

export default function CallScreen({
  localStream,
  remoteStream,
  callType,
  callDuration,
  isMuted,
  isVideoOff,
  partnerName,
  partnerAvatar,
  onToggleMute,
  onToggleVideo,
  onEndCall,
}: CallScreenProps) {
  const API_BASE = 'https://chat-back-ac0h.onrender.com';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-bg flex flex-col"
    >
      {callType === 'video' ? (
        <>
          {/* Remote video - full screen */}
          <div className="flex-1 relative bg-black">
            <VideoStream stream={remoteStream} muted={false} />
          </div>

          {/* Local video - small picture-in-picture */}
          <div className="absolute top-12 right-4 w-28 h-36 sm:w-36 sm:h-48 rounded-2xl overflow-hidden border-2 border-white/20 shadow-lg z-10">
            <VideoStream stream={localStream} muted={true} label="You" />
          </div>
        </>
      ) : (
        /* Audio call - show avatars */
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <RemoteAudio stream={remoteStream} />
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-romantic-gradient flex items-center justify-center text-6xl shadow-glow overflow-hidden"
          >
            {partnerAvatar ? (
              <img src={`${API_BASE}${partnerAvatar}`} alt="" className="w-full h-full object-cover" />
            ) : (
              '💕'
            )}
          </motion.div>
          <h2 className="text-2xl font-display gradient-text">{partnerName}</h2>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-white/60">{formatDuration(callDuration)}</span>
          </div>

          {/* Audio visualizer dots */}
          <div className="flex gap-1.5 items-center mt-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                animate={{
                  height: [4, 20, 8, 24, 4],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
                className="w-1 rounded-full bg-accent/60"
              />
            ))}
          </div>
        </div>
      )}

      {/* Call info overlay for video */}
      {callType === 'video' && (
        <div className="absolute top-12 left-4 z-10">
          <h2 className="text-lg font-display text-white drop-shadow-lg">{partnerName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-white/70">{formatDuration(callDuration)}</span>
          </div>
        </div>
      )}

      {/* Call controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pb-10 pt-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <div className="flex justify-center gap-6">
          {/* Mute button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onToggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-colors ${
              isMuted ? 'bg-red-500/80 text-white' : 'bg-white/20 text-white backdrop-blur-sm'
            }`}
          >
            {isMuted ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
                <path d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662" />
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                <line x1="2" y1="2" x2="22" y2="22" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            )}
          </motion.button>

          {/* End call button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onEndCall}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-500/30 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-7 h-7">
              <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
              <line x1="22" y1="2" x2="2" y2="22" />
            </svg>
          </motion.button>

          {/* Video toggle button (only for video calls) */}
          {callType === 'video' && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onToggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-colors ${
                isVideoOff ? 'bg-red-500/80 text-white' : 'bg-white/20 text-white backdrop-blur-sm'
              }`}
            >
              {isVideoOff ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
                  <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
                  <line x1="2" y1="2" x2="22" y2="22" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
                  <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
                  <rect x="2" y="6" width="14" height="12" rx="2" />
                </svg>
              )}
            </motion.button>
          )}

          {/* Spacer for audio calls to keep centered */}
          {callType === 'audio' && <div className="w-14" />}
        </div>
      </div>
    </motion.div>
  );
}
