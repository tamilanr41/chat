'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';
import CallScreen from '@/components/CallScreen';
import IncomingCallModal from '@/components/IncomingCallModal';
import useWebRTC from '@/hooks/useWebRTC';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { getSocket, getSignalSocket } from '@/lib/socket';
import Link from 'next/link';

interface Reaction {
  emoji: string;
  userId: string;
}

interface ReplyTo {
  messageId: string;
  text: string;
  sender: { _id: string; name: string };
}

interface Message {
  _id: string;
  text: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'sticker' | 'scratch' | 'poll' | 'dare' | 'theme';
  sender: { _id: string; name: string; nickname?: string; avatar?: string };
  createdAt: string;
  read: boolean;
  reactions: Reaction[];
  replyTo?: ReplyTo;
  theme?: string;
  pollOptions?: { text: string; votes: string[] }[];
  dareText?: string;
}

interface StickerItem {
  _id: string;
  imageUrl: string;
}

const API_BASE = 'https://chat-back-ac0h.onrender.com';

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(date: string) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function ScratchCard({ text }: { text: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scratching, setScratching] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [revealPct, setRevealPct] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#3b82f6');
    grad.addColorStop(0.5, '#8b5cf6');
    grad.addColorStop(1, '#ec4899');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('Scratch here ✨', w / 2, h / 2 + 5);
  }, []);

  const scratch = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let transparent = 0;
    for (let i = 3; i < imgData.data.length; i += 4) {
      if (imgData.data[i] === 0) transparent++;
    }
    const pct = transparent / (imgData.data.length / 4) * 100;
    setRevealPct(Math.round(pct));
    if (pct > 50 && !revealed) setRevealed(true);
  };

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  return (
    <div className="relative w-48 h-20 select-none">
      <div className={`absolute inset-0 flex items-center justify-center text-sm font-medium transition-all duration-500 ${revealed ? 'opacity-100 scale-100' : 'opacity-30 scale-95'}`}>
        {text}
      </div>
      <canvas
        ref={canvasRef}
        width={192}
        height={80}
        className="absolute inset-0 rounded-xl cursor-pointer"
        style={{ opacity: revealed ? 0 : 1, transition: 'opacity 0.5s' }}
        onMouseDown={() => setScratching(true)}
        onMouseUp={() => setScratching(false)}
        onMouseLeave={() => setScratching(false)}
        onMouseMove={(e) => { if (scratching) { const p = getPos(e); scratch(p.x, p.y); } }}
        onTouchStart={() => setScratching(true)}
        onTouchEnd={() => setScratching(false)}
        onTouchMove={(e) => { const p = getPos(e); scratch(p.x, p.y); }}
      />
      {revealed && (
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xl">✨</span>
        </motion.div>
      )}
      {!revealed && (
        <span className="absolute bottom-0 right-1 text-[8px] text-white/30">{revealPct}%</span>
      )}
    </div>
  );
}

function PollMessage({ options, msgId }: { options: { text: string; votes: string[] }[]; msgId: string }) {
  const [voted, setVoted] = useState<number | null>(null);
  const { user } = useAuth();
  const totalVotes = options.reduce((sum, o) => sum + o.votes.length, 0);

  const handleVote = async (idx: number) => {
    if (voted !== null) return;
    setVoted(idx);
    try { await api.post(`/chat/messages/${msgId}/poll/vote`, { optionIndex: idx }); } catch {}
  };

  return (
    <div className="space-y-1.5 min-w-[180px]">
      <p className="text-[10px] text-white/40 mb-2">📊 Poll</p>
      {options.map((opt, i) => {
        const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
        const isSelected = voted === i;
        return (
          <button key={i} onClick={() => handleVote(i)} className="w-full text-left relative rounded-xl overflow-hidden transition-all" disabled={voted !== null}>
            {voted !== null && (
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="absolute inset-0 bg-primary/20 rounded-xl" />
            )}
            <div className={`relative px-3 py-2 text-xs flex items-center justify-between ${isSelected ? 'text-primary-light font-medium' : 'text-white/70'}`}>
              <span>{opt.text}</span>
              {voted !== null && <span className="text-[10px] text-white/40">{opt.votes.length + (isSelected ? 1 : 0)} ({pct}%)</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function MessageBubble({
  msg,
  isMine,
  isConsecutive,
  onReply,
  onReact,
  onDelete,
  onImageOpen,
  onSwipeReply,
}: {
  msg: Message;
  isMine: boolean;
  isConsecutive: boolean;
  onReply: (m: Message) => void;
  onReact: (id: string, emoji: string) => void;
  onDelete: (id: string) => void;
  onImageOpen: (url: string) => void;
  onSwipeReply: (m: Message) => void;
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [showSwipeReply, setShowSwipeReply] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '🙏', '🔥', '💙', '😍'];

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    longPressTimer.current = setTimeout(() => {
      setShowEmojiPicker(true);
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (dy < 30 && dx < -30) {
      setSwipeX(Math.max(dx, -120));
      setShowSwipeReply(true);
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (swipeX < -80) {
      onSwipeReply(msg);
    }
    setSwipeX(0);
    setShowSwipeReply(false);
    const now = Date.now();
    if (now - lastTap.current < 300) {
      onReact(msg._id, '❤️');
    }
    lastTap.current = now;
  };

  const handleMouseDown = () => {
    longPressTimer.current = setTimeout(() => {
      setShowEmojiPicker(true);
    }, 500);
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const reactionSummary = msg.reactions?.reduce<Record<string, string[]>>((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r.userId);
    return acc;
  }, {});

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={`w-full flex ${isConsecutive ? 'mt-0.5' : 'mt-3'} ${isMine ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`group relative max-w-[80%] ${isMine ? 'items-end' : 'items-start'}`}
        style={{ transform: `translateX(${swipeX}px)`, transition: swipeX === 0 ? 'transform 0.2s ease' : 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
      >
        {/* Swipe reply indicator */}
        {showSwipeReply && swipeX < -30 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute top-1/2 -translate-y-1/2 -left-8 text-white/40 text-lg">
            ↩️
          </motion.div>
        )}

        {/* Reply preview - WhatsApp style */}
        {msg.replyTo && (
          <div
            className={`text-xs px-3 pt-2 pb-1.5 rounded-t-xl border-l-2 ${
              isMine ? 'bg-white/10 border-white/30' : 'bg-white/5 border-primary/40'
            }`}
          >
            <span className="text-primary-light font-medium text-[11px]">
              {msg.replyTo.sender?.name || 'Unknown'}
            </span>
            <p className="text-white/40 truncate max-w-[120px] sm:max-w-[200px] text-[11px] leading-snug">{msg.replyTo.text}</p>
          </div>
        )}

        {/* Bubble */}
        <div
          className={`px-4 py-2.5 text-sm leading-relaxed ${
            msg.replyTo
              ? 'rounded-b-2xl rounded-tr-2xl'
              : 'rounded-2xl'
          } ${
            isMine
              ? 'bg-romantic-gradient text-white rounded-br-md'
              : 'glass rounded-bl-md'
          } ${msg.type === 'image' ? 'p-1.5' : ''}`}
        >
          {msg.type === 'image' ? (
            <img
              src={`${API_BASE}${msg.text}`}
              alt=""
              className="max-w-full rounded-xl max-h-72 object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onImageOpen(`${API_BASE}${msg.text}`)}
              loading="lazy"
            />
          ) : msg.type === 'sticker' ? (
            <img
              src={`${API_BASE}${msg.text}`}
              alt="sticker"
              className="max-w-[180px] rounded-xl object-contain"
              loading="lazy"
            />
          ) : msg.type === 'video' ? (
            <video
              src={`${API_BASE}${msg.text}`}
              controls
              className="max-w-full rounded-xl max-h-72 object-contain"
              preload="metadata"
            />
          ) : msg.type === 'audio' ? (
            <audio
              src={`${API_BASE}${msg.text}`}
              controls
              className="max-w-full h-10"
              preload="metadata"
            />
          ) : msg.type === 'scratch' ? (
            <ScratchCard text={msg.text} />
          ) : msg.type === 'poll' ? (
            <PollMessage options={msg.pollOptions || []} msgId={msg._id} />
          ) : msg.type === 'dare' ? (
            <div className="text-center py-2">
              <p className="text-xs text-white/50 mb-1">🎡 Truth or Dare</p>
              <p className="text-sm font-medium">{msg.dareText || msg.text}</p>
            </div>
          ) : msg.type === 'theme' ? (
            <p className={`whitespace-pre-wrap break-words ${msg.theme || ''}`}>{msg.text}</p>
          ) : (
            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
          )}

          {/* Time + read receipt - WhatsApp style */}
          <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
            <span className={`text-[10px] ${isMine ? 'text-white/50' : 'text-white/30'}`}>
              {formatTime(msg.createdAt)}
            </span>
            {isMine && (
              <span className={`text-[10px] ${msg.read ? 'text-blue-400' : 'text-white/30'}`}>
                {msg.read ? (
                  <svg width="16" height="8" viewBox="0 0 16 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 4L4.5 7.5L11 1M5 4L8.5 7.5L15 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 4L4.5 7.5L9 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Reactions - Instagram style (below bubble) */}
        {reactionSummary && Object.keys(reactionSummary).length > 0 && (
          <div
            className={`flex gap-0.5 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}
          >
            <div className="flex items-center gap-0.5 bg-white/5 backdrop-blur-sm rounded-full px-1.5 py-0.5 border border-white/5">
              {Object.entries(reactionSummary).map(([emoji, users]) => (
                <button
                  key={emoji}
                  onClick={() => onReact(msg._id, emoji)}
                  className={`text-xs hover:scale-125 transition-transform ${users.includes('self') ? '' : 'opacity-60'}`}
                >
                  {emoji}
                </button>
              ))}
              {Object.keys(reactionSummary).length > 0 && (
                <span className="text-[9px] text-white/30 ml-0.5">{Object.values(reactionSummary).reduce((s, u) => s + u.length, 0)}</span>
              )}
            </div>
          </div>
        )}

        {/* Instagram-style quick reaction popup */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              className={`absolute -top-14 ${isMine ? 'right-0' : 'left-0'} flex gap-1 bg-bg-card/95 backdrop-blur-md border border-white/10 rounded-full px-2 py-1.5 shadow-xl z-20`}
            >
              {QUICK_REACTIONS.map((emoji) => (
                <motion.button
                  key={emoji}
                  whileTap={{ scale: 1.4 }}
                  whileHover={{ scale: 1.3 }}
                  onClick={() => { onReact(msg._id, emoji); setShowEmojiPicker(false); }}
                  className="text-lg hover:scale-125 transition-transform"
                >
                  {emoji}
                </motion.button>
              ))}
              <button
                onClick={() => { setShowEmojiPicker(false); onReply(msg); }}
                className="text-white/40 hover:text-white/70 text-xs px-1 flex items-center"
              >
                ↩️
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hover actions - desktop */}
        <div className={`absolute -top-8 ${isMine ? 'right-0' : 'left-0'} hidden group-hover:flex gap-1 bg-bg-card/95 backdrop-blur-md border border-white/10 rounded-full px-1.5 py-1 shadow-xl z-10`}>
          <button onClick={() => onReact(msg._id, '❤️')} className="hover:scale-125 transition-transform text-sm">❤️</button>
          <button onClick={() => onReply(msg)} className="hover:scale-125 transition-transform text-sm">↩️</button>
          {isMine && (
            <button onClick={() => onDelete(msg._id)} className="hover:scale-125 transition-transform text-sm">🗑️</button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [partnerName, setPartnerName] = useState('');
  const [partnerAvatar, setPartnerAvatar] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; x: number; startY: number; delay: number; driftX: number; travelY: number; scaleTarget: number }[]>([]);
  const [showNavMenu, setShowNavMenu] = useState(false);
  const [showMenuBtn, setShowMenuBtn] = useState(false);
  const [floatingKisses, setFloatingKisses] = useState<{ id: number }[]>([]);
  const [floatingHugs, setFloatingHugs] = useState<{ id: number }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showLovePicker, setShowLovePicker] = useState(false);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const stickerInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  // Creative features state
  const [showScratchModal, setShowScratchModal] = useState(false);
  const [scratchText, setScratchText] = useState('');
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('');

  // Call state
  const [incomingCall, setIncomingCall] = useState<{ from: string; callType: 'audio' | 'video' } | null>(null);
  const [activeCall, setActiveCall] = useState(false);

  const handleCallEnd = useCallback(() => {
    setActiveCall(false);
  }, []);

  const webrtc = useWebRTC({ onCallEnd: handleCallEnd });

  const initiateCall = async (type: 'audio' | 'video') => {
    console.log('[Call] initiateCall called:', type);
    console.log('[Call] user:', user?.id);
    if (!user?.id) return;
    try {
      const { data } = await api.get('/couple');
      console.log('[Call] couple data:', data);
      if (data.couple) {
        const partner = data.couple.user1?._id !== user.id
          ? data.couple.user1
          : data.couple.user2;
        console.log('[Call] partner:', partner?._id, partner?.name);
        if (partner?._id) {
          const socket = getSignalSocket();
          console.log('[Call] signal socket connected:', socket?.connected);
          socket?.emit('register', user.id);
          socket?.emit('call:ring', { to: partner._id, callType: type, from: user.id });
          console.log('[Call] emitted call:ring to', partner._id);
          webrtc.setCallState('calling');
          await webrtc.startCall(partner._id, type);
          setActiveCall(true);
        }
      }
    } catch (e) {
      console.log('[Call] error:', e);
    }
  };

  const acceptIncomingCall = async () => {
    if (!incomingCall) return;
    const socket = getSignalSocket();
    socket?.emit('register', user?.id);
    await webrtc.acceptCall(incomingCall.from, incomingCall.callType);
    setActiveCall(true);
    setIncomingCall(null);
  };

  const rejectIncomingCall = () => {
    const socket = getSignalSocket();
    if (incomingCall) {
      socket?.emit('call:reject', { to: incomingCall.from });
    }
    setIncomingCall(null);
  };

  useEffect(() => {
    const socket = getSignalSocket();
    if (!socket) return;

    if (user?.id) {
      socket.emit('register', user.id);
    }

    socket.on('call:ring', ({ from, callType: type }: { from: string; callType: 'audio' | 'video' }) => {
      if (!activeCall && webrtc.callState === 'idle') {
        setIncomingCall({ from, callType: type });
      }
    });

    socket.on('call:accept', ({ from }: { from: string }) => {
      // Partner accepted, webrtc will handle offer/answer
    });

    socket.on('call:reject', () => {
      webrtc.cleanup();
      setActiveCall(false);
    });

    socket.on('call:end', () => {
      webrtc.cleanup();
      setActiveCall(false);
      setIncomingCall(null);
    });

    return () => {
      socket.off('call:ring');
      socket.off('call:accept');
      socket.off('call:reject');
      socket.off('call:end');
    };
  }, [activeCall, webrtc]);

  useEffect(() => {
    const fetchPartner = async () => {
      try {
        const { data } = await api.get('/couple');
        if (data.couple) {
          const partner = data.couple.user1?._id !== user?.id
            ? data.couple.user1
            : data.couple.user2;
          setPartnerName(partner?.nickname || partner?.name || '');
          setPartnerAvatar(partner?.avatar || '');
        }
      } catch {}
    };
    fetchPartner();
  }, [user?.id]);

  const loadMessages = async () => {
    try {
      const { data } = await api.get('/chat/messages');
      setMessages(data.messages);
      setHasMore(data.messages.length >= 50);
      markAsRead(data.messages);
    } finally {
      setLoading(false);
    }
  };

  const loadOlderMessages = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const { data } = await api.get(`/chat/messages?before=${messages[0]._id}&limit=50`);
      if (data.messages.length === 0) {
        setHasMore(false);
      } else {
        setMessages((prev) => [...data.messages, ...prev]);
        setHasMore(data.messages.length >= 50);
      }
    } catch {
    } finally {
      setLoadingMore(false);
    }
  };

  const markAsRead = useCallback(async (msgs: Message[]) => {
    if (!user?.id) return;
    const unreadIds = msgs
      .filter((m) => !m.read && String(m.sender._id) !== String(user?.id))
      .map((m) => m._id);
    if (unreadIds.length > 0) {
      try { await api.patch('/chat/messages/read', { messageIds: unreadIds }); } catch {}
    }
  }, [user?.id]);

  useEffect(() => {
    loadMessages();
    const socket = getSocket();
    if (!socket) return;

    socket.on('message:new', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
      if (user?.id && String(msg.sender._id) !== String(user?.id)) {
        api.patch('/chat/messages/read', { messageIds: [msg._id] }).catch(() => {});
      }
    });

    socket.on('message:edit', ({ id, text }: { id: string; text: string }) => {
      setMessages((prev) => prev.map((m) => (m._id === id ? { ...m, text } : m)));
    });

    socket.on('message:delete', ({ id }: { id: string }) => {
      setMessages((prev) => prev.filter((m) => m._id !== id));
    });

    socket.on('message:react', ({ id, reactions }: { id: string; reactions: Reaction[] }) => {
      setMessages((prev) => prev.map((m) => (m._id === id ? { ...m, reactions } : m)));
    });

    socket.on('messages:read', ({ messageIds }: { messageIds: string[] }) => {
      setMessages((prev) => prev.map((m) =>
        messageIds.includes(m._id) ? { ...m, read: true } : m
      ));
    });

    socket.on('typing:start', () => setPartnerTyping(true));
    socket.on('typing:stop', () => setPartnerTyping(false));

    socket.on('presence:update', ({ online }: { online: string[] }) => {
      const isOnline = online.some((id) => id !== user?.id);
      setPartnerOnline(isOnline);
      if (!isOnline) setLastSeen(new Date().toISOString());
    });

    socket.on('receive:emoji', ({ emoji }: { emoji: string }) => {
      const id = Date.now() + Math.random();
      setFloatingEmojis((prev) => [...prev, { id, emoji, x: 50, startY: 50, delay: 0, driftX: 0, travelY: -300, scaleTarget: 4 }]);
      setTimeout(() => setFloatingEmojis((prev) => prev.filter((e) => e.id !== id)), 2600);
    });

    socket.on('receive:kiss', () => {
      const id = Date.now() + Math.random();
      setFloatingKisses((prev) => [...prev, { id }]);
      setTimeout(() => setFloatingKisses((prev) => prev.filter((k) => k.id !== id)), 2500);
    });

    socket.on('receive:hug', () => {
      const id = Date.now() + Math.random();
      setFloatingHugs((prev) => [...prev, { id }]);
      setTimeout(() => setFloatingHugs((prev) => prev.filter((h) => h.id !== id)), 2500);
    });

    return () => {
      socket.off('message:new');
      socket.off('message:edit');
      socket.off('message:delete');
      socket.off('message:react');
      socket.off('messages:read');
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('presence:update');
      socket.off('receive:emoji');
      socket.off('receive:kiss');
      socket.off('receive:hug');
    };
  }, [user?.id]);

  useEffect(() => {
    const fetchStickers = async () => {
      try {
        const { data } = await api.get('/stickers');
        setStickers(data.stickers);
      } catch {}
    };
    fetchStickers();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  const handleTyping = (value: string) => {
    setText(value);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 128) + 'px';
    }
    const socket = getSocket();
    if (!socket) return;
    socket.emit('typing:start');
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing:stop');
    }, 1500);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !previewFile) return;
    const value = text;
    setText('');
    getSocket()?.emit('typing:stop');

    try {
      const body: any = { text: value };
      if (replyingTo) {
        body.replyTo = {
          messageId: replyingTo._id,
          text: replyingTo.type === 'image' ? '📷 Image' : replyingTo.text,
          senderId: replyingTo.sender._id,
        };
      }
      await api.post('/chat/messages', body);
      setReplyingTo(null);
    } catch {
      setText(value);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const sendImage = async () => {
    if (!previewFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', previewFile);
      if (replyingTo) {
        formData.append('replyTo', JSON.stringify({
          messageId: replyingTo._id,
          text: replyingTo.type === 'image' ? '📷 Image' : replyingTo.text,
          senderId: replyingTo.sender._id,
        }));
      }
      await api.post('/chat/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreviewUrl(null);
      setPreviewFile(null);
      setReplyingTo(null);
    } catch {
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const sendVideo = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('video', file);
      if (replyingTo) {
        formData.append('replyTo', JSON.stringify({
          messageId: replyingTo._id,
          text: '🎬 Video',
          senderId: replyingTo.sender._id,
        }));
      }
      await api.post('/chat/upload-video', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setReplyingTo(null);
    } catch {
    } finally {
      setUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    sendVideo(file);
    setShowAttachMenu(false);
  };

  const cancelImagePreview = () => {
    setPreviewUrl(null);
    setPreviewFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReact = async (id: string, emoji: string) => {
    getSocket()?.emit('send:emoji', { emoji });
    await api.post(`/chat/messages/${id}/react`, { emoji });
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/chat/messages/${id}`);
  };

  const handleHug = () => {
    getSocket()?.emit('send:hug');
    const id = Date.now() + Math.random();
    setFloatingHugs((prev) => [...prev, { id }]);
    setTimeout(() => setFloatingHugs((prev) => prev.filter((h) => h.id !== id)), 2500);
    setShowLovePicker(false);
  };

  const handleKiss = () => {
    getSocket()?.emit('send:kiss');
    const id = Date.now() + Math.random();
    setFloatingKisses((prev) => [...prev, { id }]);
    setTimeout(() => setFloatingKisses((prev) => prev.filter((k) => k.id !== id)), 2500);
    setShowLovePicker(false);
  };

  const sendEmoji = (emoji: string) => {
    getSocket()?.emit('send:emoji', { emoji });
    setShowLovePicker(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      setRecordingTime(0);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, 'voice.webm');
        try {
          await api.post('/chat/upload-audio', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch {}
      };

      recorder.start();
      setIsRecording(true);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch {}
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const sendSticker = async (sticker: StickerItem) => {
    try {
      await api.post('/chat/messages', {
        text: sticker.imageUrl,
        type: 'sticker',
      });
      setShowStickerPicker(false);
    } catch {}
  };

  const handleStickerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('sticker', file);
    try {
      const { data } = await api.post('/stickers/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStickers((prev) => [data.sticker, ...prev]);
    } catch {}
    if (stickerInputRef.current) stickerInputRef.current.value = '';
  };

  const sendScratchCard = async () => {
    if (!scratchText.trim()) return;
    try {
      await api.post('/chat/messages', { text: scratchText, type: 'scratch' });
      setShowScratchModal(false);
      setScratchText('');
    } catch {}
  };

  const sendPoll = async () => {
    const validOptions = pollOptions.filter((o) => o.trim());
    if (validOptions.length < 2) return;
    try {
      await api.post('/chat/messages', {
        text: pollQuestion || 'Vote now!',
        type: 'poll',
        pollOptions: validOptions.map((text) => ({ text, votes: [] })),
      });
      setShowPollModal(false);
      setPollQuestion('');
      setPollOptions(['', '']);
    } catch {}
  };

  const DARES = [
    'Send a voice note singing a song 🎤',
    'Send a selfie right now 📸',
    'Text "I love you" 5 times 💙',
    'Send your favorite emoji and explain why 🤔',
    'Record a 10-second dance video 💃',
    'Send a screenshot of your home screen 📱',
    'Tell me what you ate today 🍕',
    'Send a voice note saying something romantic 🥰',
    'Text me a joke 😂',
    'Send a photo of what you\'re wearing 👗',
    'Tell me your dream vacation 🌴',
    'Send a voice note whispering "I love you" 🤫',
  ];

  const sendDare = async () => {
    const dare = DARES[Math.floor(Math.random() * DARES.length)];
    try {
      await api.post('/chat/messages', { text: dare, type: 'dare', dareText: dare });
    } catch {}
  };

  const THEMES: { label: string; class: string; preview: string }[] = [
    { label: 'Galaxy', class: 'bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500 bg-clip-text text-transparent', preview: '🌌' },
    { label: 'Fire', class: 'bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 bg-clip-text text-transparent', preview: '🔥' },
    { label: 'Ocean', class: 'bg-gradient-to-r from-cyan-400 via-blue-500 to-teal-500 bg-clip-text text-transparent', preview: '🌊' },
    { label: 'Neon', class: 'text-green-400 font-bold', preview: '💚' },
    { label: 'Gold', class: 'bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 bg-clip-text text-transparent', preview: '✨' },
  ];

  const sendThemedMessage = async (theme: string) => {
    if (!text.trim()) return;
    const value = text;
    setText('');
    try {
      await api.post('/chat/messages', { text: value, type: 'theme', theme });
      setShowThemePicker(false);
      setSelectedTheme('');
    } catch { setText(value); }
  };

  const grouped: { date: string; items: Message[] }[] = [];
  messages.forEach((msg) => {
    const label = formatDateLabel(msg.createdAt);
    const lastGroup = grouped[grouped.length - 1];
    if (lastGroup && lastGroup.date === label) {
      lastGroup.items.push(msg);
    } else {
      grouped.push({ date: label, items: [msg] });
    }
  });

  return (
    <ProtectedRoute>
      <main className="relative min-h-screen flex flex-col">
        {/* Header */}
        <div className="glass sticky top-0 z-20 px-4 py-3 flex items-center gap-3 rounded-b-2xl">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-romantic-gradient flex items-center justify-center text-lg font-bold overflow-hidden">
              {partnerAvatar ? (
                <img src={`${API_BASE}${partnerAvatar}`} alt="" className="w-full h-full object-cover" />
              ) : (
                partnerOnline ? '💕' : '💔'
              )}
            </div>
            {partnerOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-black" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-lg gradient-text truncate">{partnerName || 'Our Chat'}</h1>
              <p className="text-xs text-white/40 truncate">
                {partnerTyping
                  ? 'typing...'
                  : partnerOnline
                    ? 'Online'
                    : lastSeen
                      ? `Last seen ${formatTime(lastSeen)}`
                      : 'Offline'}
              </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => initiateCall('audio')}
              disabled={activeCall}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-30"
              title="Voice Call"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-white/70">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => initiateCall('video')}
              disabled={activeCall}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-30"
              title="Video Call"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-white/70">
                <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
                <rect x="2" y="6" width="14" height="12" rx="2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={chatRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
            setShowScrollBtn(!atBottom);
            if (el.scrollTop < 80 && hasMore && !loadingMore) {
              const prevHeight = el.scrollHeight;
              loadOlderMessages().then(() => {
                requestAnimationFrame(() => {
                  el.scrollTop = el.scrollHeight - prevHeight;
                });
              });
            }
          }}
          className="flex-1 px-3 pt-3 pb-44 overflow-y-auto flex flex-col"
        >
          {loadingMore && (
            <div className="flex justify-center py-3">
              <span className="w-5 h-5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
            </div>
          )}
          {hasMore && messages.length > 0 && !loadingMore && (
            <button
              type="button"
              onClick={() => {
                const el = chatRef.current;
                const prevHeight = el?.scrollHeight || 0;
                loadOlderMessages().then(() => {
                  requestAnimationFrame(() => {
                    if (el) el.scrollTop = el.scrollHeight - prevHeight;
                  });
                });
              }}
              className="text-xs text-white/40 hover:text-white/60 py-2 text-center"
            >
              Load older messages
            </button>
          )}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <span className="w-6 h-6 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-2">
              <span className="text-5xl mb-2 animate-pulse">💌</span>
              <p className="text-white/60 text-sm font-medium">No messages yet</p>
              <p className="text-white/30 text-xs">Say something sweet to start 💕</p>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.date}>
                <div className="flex justify-center my-4">
                  <span className="text-[10px] text-white/30 bg-white/5 px-3 py-1 rounded-full">
                    {group.date}
                  </span>
                </div>
                {group.items.map((msg, idx) => {
                  const isMine = String(msg.sender._id) === String(user?.id);
                  const prevMsg = group.items[idx - 1];
                  const sameSenderAsPrev =
                    prevMsg && String(prevMsg.sender._id) === String(msg.sender._id);

                  return (
                    <MessageBubble
                      key={msg._id}
                      msg={msg}
                      isMine={isMine}
                      isConsecutive={!!sameSenderAsPrev}
                      onReply={setReplyingTo}
                      onReact={handleReact}
                      onDelete={handleDelete}
                      onImageOpen={setFullscreenImage}
                      onSwipeReply={setReplyingTo}
                    />
                  );
                })}
              </div>
            ))
          )}

          <AnimatePresence>
            {partnerTyping && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass rounded-2xl rounded-bl-md px-4 py-3 w-fit mt-2"
              >
                <span className="inline-flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>

        {/* Scroll to bottom FAB */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => {
                bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
                setShowScrollBtn(false);
              }}
              className="fixed bottom-36 right-4 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-lg hover:bg-white/20 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-white/70">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Reply preview bar */}
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-[140px] left-0 right-0 z-20 px-4"
            >
              <div className="glass rounded-t-2xl px-4 py-2 max-w-md mx-auto flex items-center gap-2 border-b border-white/10">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-primary-light font-medium">Replying</p>
                  <p className="text-xs text-white/50 truncate">
                    {replyingTo.type === 'image' ? '📷 Image' : replyingTo.text}
                  </p>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="text-white/40 hover:text-white/70 text-lg"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image preview bar */}
        <AnimatePresence>
          {previewUrl && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-[140px] left-0 right-0 z-20 px-4"
            >
              <div className="glass rounded-t-2xl p-3 max-w-md mx-auto flex items-center gap-3 border-b border-white/10">
                <img
                  src={previewUrl}
                  alt="preview"
                  className="w-12 h-12 rounded-xl object-cover"
                />
                <span className="text-xs text-white/50 flex-1">Image ready to send</span>
                <button
                  onClick={cancelImagePreview}
                  className="text-white/40 hover:text-white/70 text-lg"
                >
                  ✕
                </button>
                <button
                  onClick={sendImage}
                  disabled={uploading}
                  className="px-4 py-1.5 rounded-xl bg-romantic-gradient text-xs font-medium disabled:opacity-40"
                >
                  {uploading ? '...' : 'Send'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input bar */}
        <div className={`fixed left-0 right-0 z-20 px-3 transition-all duration-300 ${showMenuBtn ? 'bottom-[76px]' : 'bottom-2'}`}>
          <form
            onSubmit={previewFile ? (e) => { e.preventDefault(); sendImage(); } : handleSend}
            className="glass rounded-2xl flex items-end gap-1 p-2 max-w-md mx-auto"
          >
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageSelect}
              className="hidden"
            />
            <input
              type="file"
              accept="video/*"
              ref={videoInputRef}
              onChange={handleVideoSelect}
              className="hidden"
            />
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-white/60">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <AnimatePresence>
                {showAttachMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className="absolute bottom-full mb-2 left-0 glass rounded-2xl px-2 py-2 flex gap-2 shadow-lg z-10"
                  >
                    <button type="button" onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }} className="flex flex-col items-center gap-0.5 p-2 hover:bg-white/10 rounded-xl transition-colors">
                      <span className="text-lg">📷</span>
                      <span className="text-[9px] text-white/40">Photo</span>
                    </button>
                    <button type="button" onClick={() => { videoInputRef.current?.click(); setShowAttachMenu(false); }} className="flex flex-col items-center gap-0.5 p-2 hover:bg-white/10 rounded-xl transition-colors">
                      <span className="text-lg">📹</span>
                      <span className="text-[9px] text-white/40">Video</span>
                    </button>
                    <button type="button" onClick={() => { setShowAttachMenu(false); if (!isRecording) startRecording(); else stopRecording(); }} className="flex flex-col items-center gap-0.5 p-2 hover:bg-white/10 rounded-xl transition-colors">
                      <span className="text-lg">{isRecording ? '⏹️' : '🎤'}</span>
                      <span className="text-[9px] text-white/40">{isRecording ? 'Stop' : 'Voice'}</span>
                    </button>
                    <button type="button" onClick={() => { setShowStickerPicker(!showStickerPicker); setShowAttachMenu(false); }} className="flex flex-col items-center gap-0.5 p-2 hover:bg-white/10 rounded-xl transition-colors">
                      <span className="text-lg">🎨</span>
                      <span className="text-[9px] text-white/40">Sticker</span>
                    </button>
                    <button type="button" onClick={() => { setShowScratchModal(true); setShowAttachMenu(false); }} className="flex flex-col items-center gap-0.5 p-2 hover:bg-white/10 rounded-xl transition-colors">
                      <span className="text-lg">🎰</span>
                      <span className="text-[9px] text-white/40">Scratch</span>
                    </button>
                    <button type="button" onClick={() => { setShowPollModal(true); setShowAttachMenu(false); }} className="flex flex-col items-center gap-0.5 p-2 hover:bg-white/10 rounded-xl transition-colors">
                      <span className="text-lg">📊</span>
                      <span className="text-[9px] text-white/40">Poll</span>
                    </button>
                    <button type="button" onClick={() => { sendDare(); setShowAttachMenu(false); }} className="flex flex-col items-center gap-0.5 p-2 hover:bg-white/10 rounded-xl transition-colors">
                      <span className="text-lg">🎡</span>
                      <span className="text-[9px] text-white/40">Dare</span>
                    </button>
                    <button type="button" onClick={() => { setShowThemePicker(!showThemePicker); setShowAttachMenu(false); }} className="flex flex-col items-center gap-0.5 p-2 hover:bg-white/10 rounded-xl transition-colors">
                      <span className="text-lg">🌈</span>
                      <span className="text-[9px] text-white/40">Theme</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {isRecording && (
              <button type="button" onClick={stopRecording} className="shrink-0 p-2 rounded-xl bg-red-500/30 text-red-300 font-mono text-xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                {String(recordingTime).padStart(2, '0')}s
              </button>
            )}
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  (e.target as HTMLTextAreaElement).form?.requestSubmit();
                }
              }}
              placeholder={previewFile ? 'Add a caption...' : 'Type a message...'}
              rows={1}
              className="flex-1 bg-transparent rounded-xl px-3 py-2.5 text-sm outline-none placeholder:text-white/30 resize-none overflow-y-auto max-h-32"
            />
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowLovePicker(!showLovePicker)}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-400">
                  <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.218l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
                </svg>
              </button>
              <AnimatePresence>
                {showLovePicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className="fixed bottom-20 left-0 right-0 mx-auto w-fit glass rounded-2xl px-2 sm:px-3 py-2 shadow-lg"
                  >
                    <div className="flex gap-1 sm:gap-2 flex-nowrap">
                      <button type="button" onClick={() => sendEmoji('🤗')} className="text-lg sm:text-xl hover:scale-125 transition-transform">🤗</button>
                      <button type="button" onClick={() => sendEmoji('💋')} className="text-lg sm:text-xl hover:scale-125 transition-transform">💋</button>
                      <button type="button" onClick={() => sendEmoji('❤️')} className="text-lg sm:text-xl hover:scale-125 transition-transform">❤️</button>
                      <button type="button" onClick={() => sendEmoji('😍')} className="text-lg sm:text-xl hover:scale-125 transition-transform">😍</button>
                      <button type="button" onClick={() => sendEmoji('🥰')} className="text-lg sm:text-xl hover:scale-125 transition-transform">🥰</button>
                      <button type="button" onClick={() => sendEmoji('😘')} className="text-lg sm:text-xl hover:scale-125 transition-transform">😘</button>
                      <button type="button" onClick={() => sendEmoji('💕')} className="text-lg sm:text-xl hover:scale-125 transition-transform">💕</button>
                      <button type="button" onClick={() => sendEmoji('💖')} className="text-lg sm:text-xl hover:scale-125 transition-transform">💖</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="submit"
              disabled={(!text.trim() && !previewFile) || uploading}
              className="shrink-0 p-2.5 rounded-xl bg-romantic-gradient disabled:opacity-30 transition-opacity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
              </svg>
            </motion.button>
          </form>

          {/* Sticker picker */}
          <AnimatePresence>
            {showStickerPicker && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="glass rounded-2xl p-3 max-w-md mx-auto mt-2"
              >
                <input
                  type="file"
                  accept="image/*"
                  ref={stickerInputRef}
                  onChange={handleStickerUpload}
                  className="hidden"
                />
                <div className="flex gap-2 flex-wrap justify-center max-h-40 overflow-y-auto">
                  {stickers.map((s) => (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => sendSticker(s)}
                      className="hover:scale-110 transition-transform"
                    >
                      <img src={`${API_BASE}${s.imageUrl}`} alt="" className="w-14 h-14 rounded-xl object-cover" />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => stickerInputRef.current?.click()}
                  className="mt-2 text-[11px] text-white/40 hover:text-white/70 w-full text-center"
                >
                  + Upload Sticker
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Fullscreen image viewer */}
        <AnimatePresence>
          {fullscreenImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
              onClick={() => setFullscreenImage(null)}
            >
              <button
                className="absolute top-6 right-6 text-white/70 text-2xl hover:text-white z-10"
                onClick={() => setFullscreenImage(null)}
              >
                ✕
              </button>
              <motion.img
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                src={fullscreenImage}
                alt=""
                className="max-w-full max-h-full rounded-2xl object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating emoji animation — center screen */}
        <AnimatePresence>
          {floatingEmojis.map((e) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 1, scale: 0.5 }}
              animate={{ opacity: 0, scale: 4, y: -200 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, ease: 'easeOut' }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 text-7xl"
            >
              {e.emoji}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Floating kiss animation */}
        <AnimatePresence>
          {floatingKisses.map((k) => (
            <motion.div
              key={k.id}
              initial={{ opacity: 1, y: 0, scale: 0.3, rotate: -10 }}
              animate={{ opacity: 0, y: -350, scale: 2, rotate: 10 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.5, ease: 'easeOut' }}
              className="fixed bottom-16 left-1/2 -translate-x-1/2 pointer-events-none z-50 text-7xl"
            >
              💋
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Floating hug animation */}
        <AnimatePresence>
          {floatingHugs.map((h) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 1, y: 0, scale: 0.3 }}
              animate={{ opacity: 0, y: -350, scale: 2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.5, ease: 'easeOut' }}
              className="fixed bottom-16 left-1/2 -translate-x-1/2 pointer-events-none z-50 text-7xl"
            >
              🤗
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Pill trigger — always at bottom */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowMenuBtn((s) => !s)}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-10 h-1.5 rounded-full bg-white/20 hover:bg-white/40 transition-colors"
        />

        {/* Menu cluster — appears above input when triggered */}
        <AnimatePresence>
          {showMenuBtn && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30"
            >
              <div className="relative flex items-center justify-center">
                <AnimatePresence>
                  {showNavMenu && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="absolute right-full mr-3"
                    >
                      <Link href="/dashboard" onClick={() => { setShowNavMenu(false); setShowMenuBtn(false); }}>
                        <motion.div
                          whileTap={{ scale: 0.9 }}
                          className="w-12 h-12 rounded-full glass flex items-center justify-center text-xl shadow-lg"
                        >
                          🏠
                        </motion.div>
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    if (showNavMenu) {
                      setShowNavMenu(false);
                      setShowMenuBtn(false);
                    } else {
                      setShowNavMenu(true);
                    }
                  }}
                  className="w-12 h-12 rounded-full bg-romantic-gradient shadow-lg flex items-center justify-center text-lg z-10"
                >
                  {showNavMenu ? '✕' : '☰'}
                </motion.button>

                <AnimatePresence>
                  {showNavMenu && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="absolute left-full ml-3"
                    >
                      <Link href="/memories" onClick={() => { setShowNavMenu(false); setShowMenuBtn(false); }}>
                        <motion.div
                          whileTap={{ scale: 0.9 }}
                          className="w-12 h-12 rounded-full glass flex items-center justify-center text-xl shadow-lg"
                        >
                          📸
                        </motion.div>
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Scratch Card Modal */}
      <AnimatePresence>
        {showScratchModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-6" onClick={() => setShowScratchModal(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="glass rounded-3xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-display gradient-text text-center mb-4">🎰 Scratch Card</h3>
              <p className="text-xs text-white/40 text-center mb-3">Partner has to scratch to reveal your message!</p>
              <textarea value={scratchText} onChange={(e) => setScratchText(e.target.value)} placeholder="Type your hidden message..." rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/60 resize-none mb-4" />
              <div className="flex gap-2">
                <button onClick={() => setShowScratchModal(false)} className="flex-1 py-2 rounded-xl glass text-sm">Cancel</button>
                <button onClick={sendScratchCard} disabled={!scratchText.trim()} className="flex-1 py-2 rounded-xl bg-romantic-gradient text-sm font-medium disabled:opacity-30">Send 🎰</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Poll Modal */}
      <AnimatePresence>
        {showPollModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-6" onClick={() => setShowPollModal(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="glass rounded-3xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-display gradient-text text-center mb-4">📊 Create Poll</h3>
              <input value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder="Question (optional)..." className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/60 mb-3" />
              {pollOptions.map((opt, i) => (
                <input key={i} value={opt} onChange={(e) => { const newOpts = [...pollOptions]; newOpts[i] = e.target.value; setPollOptions(newOpts); }} placeholder={`Option ${i + 1}...`} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/60 mb-2" />
              ))}
              {pollOptions.length < 4 && (
                <button onClick={() => setPollOptions([...pollOptions, ''])} className="w-full py-1.5 rounded-xl border border-dashed border-white/10 text-xs text-white/30 mb-3">+ Add option</button>
              )}
              <div className="flex gap-2">
                <button onClick={() => setShowPollModal(false)} className="flex-1 py-2 rounded-xl glass text-sm">Cancel</button>
                <button onClick={sendPoll} disabled={pollOptions.filter((o) => o.trim()).length < 2} className="flex-1 py-2 rounded-xl bg-romantic-gradient text-sm font-medium disabled:opacity-30">Send 📊</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Theme Picker */}
      <AnimatePresence>
        {showThemePicker && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="fixed bottom-[140px] left-0 right-0 z-30 px-4">
            <div className="glass rounded-2xl p-3 max-w-md mx-auto">
              <p className="text-[10px] text-white/40 text-center mb-2">Type a message then pick a theme</p>
              <div className="flex gap-2 justify-center">
                {THEMES.map((t) => (
                  <button key={t.label} onClick={() => sendThemedMessage(t.class)} className="flex flex-col items-center gap-1 p-2 hover:bg-white/10 rounded-xl transition-colors">
                    <span className="text-xl">{t.preview}</span>
                    <span className="text-[8px] text-white/40">{t.label}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowThemePicker(false)} className="w-full text-[10px] text-white/30 mt-2">cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incoming Call Modal */}
      <AnimatePresence>
        {incomingCall && (
          <IncomingCallModal
            callerName={partnerName}
            callerAvatar={partnerAvatar}
            callType={incomingCall.callType}
            onAccept={acceptIncomingCall}
            onReject={rejectIncomingCall}
          />
        )}
      </AnimatePresence>

      {/* Active Call Screen */}
      <AnimatePresence>
        {activeCall && (
          <CallScreen
            localStream={webrtc.localStream}
            remoteStream={webrtc.remoteStream}
            callType={webrtc.callType}
            callDuration={webrtc.callDuration}
            isMuted={webrtc.isMuted}
            isVideoOff={webrtc.isVideoOff}
            partnerName={partnerName}
            partnerAvatar={partnerAvatar}
            onToggleMute={webrtc.toggleMute}
            onToggleVideo={webrtc.toggleVideo}
            onEndCall={webrtc.endCall}
          />
        )}
      </AnimatePresence>
    </ProtectedRoute>
  );
}
