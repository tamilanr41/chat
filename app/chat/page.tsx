'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';
import CallScreen from '@/components/CallScreen';
import IncomingCallModal from '@/components/IncomingCallModal';
import useWebRTC from '@/hooks/useWebRTC';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import Link from 'next/link';
import EmojiPicker from '@/components/EmojiPicker';
import GifPicker from '@/components/GifPicker';
import MessageContextMenu, { type ContextMenuItem } from '@/components/MessageContextMenu';
import LocationShare from '@/components/LocationShare';
import MessageInfo from '@/components/MessageInfo';

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
  type: 'text' | 'image' | 'audio' | 'video' | 'sticker';
  sender: { _id: string; name: string; nickname?: string; avatar?: string };
  createdAt: string;
  read: boolean;
  reactions: Reaction[];
  replyTo?: ReplyTo;
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

function MessageBubble({
  msg,
  isMine,
  isConsecutive,
  onReply,
  onReact,
  onDelete,
  onImageOpen,
  onSwipeReply,
  onContextMenu,
}: {
  msg: Message;
  isMine: boolean;
  isConsecutive: boolean;
  onReply: (m: Message) => void;
  onReact: (id: string, emoji: string) => void;
  onDelete: (id: string) => void;
  onImageOpen: (url: string) => void;
  onSwipeReply: (m: Message) => void;
  onContextMenu: (msg: Message, e: React.MouseEvent) => void;
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
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={`w-full flex ${isConsecutive ? 'mt-[2px]' : 'mt-3'} ${isMine ? 'justify-end' : 'justify-start'}`}
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
        onContextMenu={(e) => onContextMenu(msg, e)}
      >
        {showSwipeReply && swipeX < -30 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute top-1/2 -translate-y-1/2 -left-8 text-white/40 text-lg">
            ↩️
          </motion.div>
        )}

        {msg.replyTo && (
          <div
            className={`text-[11px] px-3 pt-2 pb-1.5 rounded-t-2xl border-l-[3px] ${
              isMine ? 'bg-white/[0.08] border-white/40' : 'bg-white/[0.04] border-primary/60'
            }`}
          >
            <span className="font-semibold text-primary-light text-[11px]">
              {msg.replyTo.sender?.name || 'Unknown'}
            </span>
            <p className="text-white/35 truncate max-w-[180px] sm:max-w-[220px] text-[11px] leading-snug mt-0.5">{msg.replyTo.text}</p>
          </div>
        )}

        <div
          className={`px-3 py-2 text-[14px] leading-[1.45] ${
            msg.replyTo
              ? 'rounded-b-2xl rounded-tr-2xl'
              : 'rounded-2xl'
          } ${
            isMine
              ? msg.replyTo
                ? 'bubble-gradient text-white rounded-br-md'
                : 'bubble-gradient text-white rounded-br-md shadow-[0_1px_4px_rgba(182,122,248,0.3)]'
              : msg.replyTo
                ? 'bg-white/[0.08] text-white/90 rounded-bl-md border border-white/[0.04]'
                : 'bg-white/[0.08] text-white/90 rounded-bl-md border border-white/[0.04] shadow-[0_1px_2px_rgba(0,0,0,0.15)]'
          } ${msg.type === 'image' ? 'p-1' : ''}`}
        >
          {msg.type === 'image' ? (
            <img
              src={`${API_BASE}${msg.text}`}
              alt=""
              className="max-w-full rounded-xl max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onImageOpen(`${API_BASE}${msg.text}`)}
              loading="lazy"
            />
          ) : msg.type === 'sticker' ? (
            <img
              src={`${API_BASE}${msg.text}`}
              alt="sticker"
              className="max-w-[160px] object-contain"
              loading="lazy"
            />
          ) : msg.type === 'video' ? (
            <video
              src={`${API_BASE}${msg.text}`}
              controls
              className="max-w-full rounded-xl max-h-64 object-contain"
              preload="metadata"
            />
          ) : msg.type === 'audio' ? (
            <audio
              src={`${API_BASE}${msg.text}`}
              controls
              className="max-w-full h-9"
              preload="metadata"
            />
          ) : (
            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
          )}

          <div className={`flex items-center gap-1 justify-end -mb-0.5 mt-1`}>
            <span className={`text-[10px] ${isMine ? 'text-white/40' : 'text-white/25'}`}>
              {formatTime(msg.createdAt)}
            </span>
            {isMine && (
              <span className={msg.read ? 'text-purple-300' : 'text-white/25'}>
                {msg.read ? (
                  <svg width="14" height="7" viewBox="0 0 14 7" fill="none"><path d="M1 3.5L3.5 6L9 1M4 3.5L6.5 6L12 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : (
                  <svg width="10" height="7" viewBox="0 0 10 7" fill="none"><path d="M1 3.5L3.5 6L9 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                )}
              </span>
            )}
          </div>
        </div>

        {reactionSummary && Object.keys(reactionSummary).length > 0 && (
          <div className={`flex mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
            <div className="flex items-center gap-0.5 bg-white/[0.06] backdrop-blur-md rounded-full px-1.5 py-[3px] border border-white/[0.06] shadow-sm">
              {Object.entries(reactionSummary).map(([emoji, users]) => (
                <button
                  key={emoji}
                  onClick={() => onReact(msg._id, emoji)}
                  className="text-[13px] hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
              <span className="text-[9px] text-white/25 ml-0.5">{Object.values(reactionSummary).reduce((s, u) => s + u.length, 0)}</span>
            </div>
          </div>
        )}

        {/* Quick reaction popup */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 8 }}
              className={`absolute -top-14 ${isMine ? 'right-0' : 'left-0'} flex gap-0.5 bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/[0.08] rounded-full px-2 py-1.5 shadow-2xl z-20`}
            >
              {QUICK_REACTIONS.map((emoji) => (
                <motion.button
                  key={emoji}
                  whileTap={{ scale: 1.5 }}
                  onClick={() => { onReact(msg._id, emoji); setShowEmojiPicker(false); }}
                  className="text-lg hover:scale-125 transition-transform px-0.5"
                >
                  {emoji}
                </motion.button>
              ))}
              <button
                onClick={() => { setShowEmojiPicker(false); onReply(msg); }}
                className="text-white/30 hover:text-white/60 text-xs px-1 flex items-center"
              >
                ↩️
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop hover actions */}
        <div className={`absolute -top-9 ${isMine ? 'right-0' : 'left-0'} hidden group-hover:flex gap-0.5 bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/[0.08] rounded-full px-1.5 py-1 shadow-2xl z-10`}>
          <button onClick={() => onReact(msg._id, '❤️')} className="hover:scale-125 transition-transform text-sm px-0.5">❤️</button>
          <button onClick={() => onReply(msg)} className="hover:scale-125 transition-transform text-sm px-0.5">↩️</button>
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
  const [floatingKisses, setFloatingKisses] = useState<{ id: number }[]>([]);
  const [floatingHugs, setFloatingHugs] = useState<{ id: number }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const stickerInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  // Feature state
  const [showFullEmojiPicker, setShowFullEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ msg: Message; position: { x: number; y: number } } | null>(null);
  const [showLocationShare, setShowLocationShare] = useState(false);
  const [messageInfo, setMessageInfo] = useState<Message | null>(null);

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
          const socket = getSocket();
          console.log('[Call] main socket connected:', socket?.connected);
          socket?.emit('call:ring', { callType: type });
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
    const socket = getSocket();
    await webrtc.acceptCall(incomingCall.from, incomingCall.callType);
    setActiveCall(true);
    setIncomingCall(null);
  };

  const rejectIncomingCall = () => {
    const socket = getSocket();
    if (incomingCall) {
      socket?.emit('call:reject', {});
    }
    setIncomingCall(null);
  };

  useEffect(() => {
    const socket = getSocket();
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
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    loadMessages();
    const socket = getSocket();
    if (!socket) return;

    socket.on('message:new', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
      if (user?.id && String(msg.sender._id) !== String(user?.id)) {
        api.patch('/chat/messages/read', { messageIds: [msg._id] }).catch(() => {});
        if ('Notification' in window && Notification.permission === 'granted') {
          const senderName = msg.sender.nickname || msg.sender.name || 'Partner';
          let body = msg.text;
          if (msg.type === 'image') body = '📷 Photo';
          else if (msg.type === 'sticker') body = '🎨 Sticker';
          else if (msg.type === 'video') body = '🎬 Video';
          else if (msg.type === 'audio') body = '🎤 Voice message';
          new Notification(senderName, { body, icon: partnerAvatar ? `${API_BASE}${partnerAvatar}` : undefined, tag: 'chat-message' });
        }
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
  };

  const handleKiss = () => {
    getSocket()?.emit('send:kiss');
    const id = Date.now() + Math.random();
    setFloatingKisses((prev) => [...prev, { id }]);
    setTimeout(() => setFloatingKisses((prev) => prev.filter((k) => k.id !== id)), 2500);
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

  const handleContextMenu = (msg: Message, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ msg, position: { x: e.clientX, y: e.clientY } });
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
        <header className="sticky top-0 z-20 px-3 pt-2 pb-1">
          <div className="glass rounded-2xl px-3 py-2 flex items-center gap-3 shadow-[0_4px_30px_rgba(0,0,0,0.3)] border border-white/[0.06]">
            {/* Back button */}
            <Link
              href="/dashboard"
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white/60">
                <path d="M19 12H5" />
                <path d="m12 19-7-7 7-7" />
              </svg>
            </Link>

            {/* Avatar with animated ring */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-br from-primary via-accent to-primary">
                <div className="w-full h-full rounded-full overflow-hidden bg-bg relative">
                  {partnerAvatar ? (
                    <>
                      <img src={`${API_BASE}${partnerAvatar}`} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }} />
                      <div className="w-full h-full flex items-center justify-center text-base hidden absolute inset-0">💞</div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-base">
                      💞
                    </div>
                  )}
                </div>
              </div>
              {partnerOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-bg-card shadow-[0_0_6px_rgba(74,222,128,0.4)]" />
              )}
            </div>

            {/* Name + Status */}
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-[15px] font-semibold gradient-text truncate leading-tight">
                {partnerName || 'Our Chat'}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                {partnerTyping ? (
                  <span className="flex items-center gap-[3px]">
                    <span className="w-[5px] h-[5px] bg-green-400 rounded-full" style={{ animation: 'typing-dot 1.4s infinite ease-in-out', animationDelay: '0ms' }} />
                    <span className="w-[5px] h-[5px] bg-green-400 rounded-full" style={{ animation: 'typing-dot 1.4s infinite ease-in-out', animationDelay: '200ms' }} />
                    <span className="w-[5px] h-[5px] bg-green-400 rounded-full" style={{ animation: 'typing-dot 1.4s infinite ease-in-out', animationDelay: '400ms' }} />
                  </span>
                ) : partnerOnline ? (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-[11px] text-green-400/80">online</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-white/30">
                    {lastSeen ? `last seen ${formatTime(lastSeen)}` : 'offline'}
                  </span>
                )}
              </div>
            </div>

            {/* Call buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => initiateCall('audio')}
                disabled={activeCall}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-30"
                title="Voice Call"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] text-white/60">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => initiateCall('video')}
                disabled={activeCall}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-30"
                title="Video Call"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] text-white/60">
                  <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
                  <rect x="2" y="6" width="14" height="12" rx="2" />
                </svg>
              </button>
            </div>
          </div>
        </header>

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
          className="flex-1 px-2 sm:px-4 pt-3 pb-44 overflow-y-auto flex flex-col relative z-[1]"
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
              className="text-[11px] text-white/30 hover:text-white/50 py-2 text-center"
            >
              Load older messages
            </button>
          )}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <span className="w-6 h-6 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3">
              <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                <span className="text-3xl">💌</span>
              </div>
              <div>
                <p className="text-white/50 text-sm font-medium">No messages yet</p>
                <p className="text-white/25 text-xs mt-1">Say something sweet to start the conversation</p>
              </div>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.date}>
                <div className="flex justify-center my-4">
                  <span className="text-[10px] text-white/30 bg-white/[0.04] backdrop-blur-sm px-3 py-1 rounded-full border border-white/[0.04]">
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
                      onContextMenu={handleContextMenu}
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
                className="bg-white/[0.08] rounded-2xl rounded-bl-md px-4 py-2 w-fit mt-2 border border-white/[0.04]"
              >
                <span className="inline-flex gap-[3px] items-center px-1 py-1.5">
                  <span className="w-[6px] h-[6px] bg-white/30 rounded-full" style={{ animation: 'typing-dot 1.4s infinite ease-in-out', animationDelay: '0ms' }} />
                  <span className="w-[6px] h-[6px] bg-white/30 rounded-full" style={{ animation: 'typing-dot 1.4s infinite ease-in-out', animationDelay: '200ms' }} />
                  <span className="w-[6px] h-[6px] bg-white/30 rounded-full" style={{ animation: 'typing-dot 1.4s infinite ease-in-out', animationDelay: '400ms' }} />
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
              className="fixed bottom-36 right-4 z-20 w-9 h-9 rounded-full bg-[#1a1a2e]/90 backdrop-blur-md border border-white/[0.08] flex items-center justify-center shadow-xl hover:bg-[#1a1a2e] transition-colors"
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
        <div className="fixed left-0 right-0 z-20 px-3 transition-all duration-300 bottom-2">
          <div className="max-w-md mx-auto">
            <form
              onSubmit={previewFile ? (e) => { e.preventDefault(); sendImage(); } : handleSend}
              className="glass rounded-2xl shadow-[0_-2px_20px_rgba(0,0,0,0.2)] border border-white/[0.06] flex items-end gap-1.5 p-1.5"
            >
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
              <input type="file" accept="video/*" ref={videoInputRef} onChange={handleVideoSelect} className="hidden" />

              {/* Attach button */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 text-white/50 transition-transform duration-200 ${showAttachMenu ? 'rotate-45' : ''}`}>
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
                <AnimatePresence>
                  {showAttachMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      className="absolute bottom-full mb-2 left-0 glass rounded-2xl px-2 py-2 flex gap-1 shadow-2xl z-10 border border-white/[0.06]"
                    >
                    <button type="button" onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }} className="flex flex-col items-center gap-1 p-2.5 hover:bg-white/10 rounded-xl transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-white/60"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                      <span className="text-[9px] text-white/40">Photo</span>
                    </button>
                    <button type="button" onClick={() => { videoInputRef.current?.click(); setShowAttachMenu(false); }} className="flex flex-col items-center gap-1 p-2.5 hover:bg-white/10 rounded-xl transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-white/60"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" /><rect x="2" y="6" width="14" height="12" rx="2" /></svg>
                      <span className="text-[9px] text-white/40">Video</span>
                    </button>
                    <button type="button" onClick={() => { setShowAttachMenu(false); if (!isRecording) startRecording(); else stopRecording(); }} className="flex flex-col items-center gap-1 p-2.5 hover:bg-white/10 rounded-xl transition-colors">
                      {isRecording ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-400"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-white/60"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
                      )}
                      <span className="text-[9px] text-white/40">{isRecording ? 'Stop' : 'Voice'}</span>
                    </button>
                    <button type="button" onClick={() => { setShowStickerPicker(!showStickerPicker); setShowAttachMenu(false); }} className="flex flex-col items-center gap-1 p-2.5 hover:bg-white/10 rounded-xl transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-white/60"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>
                      <span className="text-[9px] text-white/40">Sticker</span>
                    </button>
                    <button type="button" onClick={() => { setShowGifPicker(!showGifPicker); setShowAttachMenu(false); }} className="flex flex-col items-center gap-1 p-2.5 hover:bg-white/10 rounded-xl transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-white/60"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M7 8h4M7 12h10" /></svg>
                      <span className="text-[9px] text-white/40">GIF</span>
                    </button>
                    <button type="button" onClick={() => { setShowLocationShare(true); setShowAttachMenu(false); }} className="flex flex-col items-center gap-1 p-2.5 hover:bg-white/10 rounded-xl transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-white/60"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                      <span className="text-[9px] text-white/40">Location</span>
                    </button>
                    <div className="w-px bg-white/10 mx-0.5" />
                    <Link href="/dashboard" onClick={() => setShowAttachMenu(false)}>
                      <div className="flex flex-col items-center gap-1 p-2.5 hover:bg-white/10 rounded-xl transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-white/60"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9,22 9,12 15,12 15,22" /></svg>
                        <span className="text-[9px] text-white/40">Home</span>
                      </div>
                    </Link>
                    <Link href="/memories" onClick={() => setShowAttachMenu(false)}>
                      <div className="flex flex-col items-center gap-1 p-2.5 hover:bg-white/10 rounded-xl transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-white/60"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                        <span className="text-[9px] text-white/40">Memory</span>
                      </div>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {isRecording && (
              <button type="button" onClick={stopRecording} className="shrink-0 w-9 h-9 rounded-full bg-red-500/20 text-red-300 font-mono text-xs flex items-center justify-center gap-1">
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
              placeholder={previewFile ? 'Add a caption...' : 'Message...'}
              rows={1}
              className="flex-1 bg-white/[0.04] rounded-xl px-3.5 py-2 text-sm outline-none placeholder:text-white/25 resize-none overflow-y-auto max-h-32 border border-white/[0.04] focus:border-white/[0.08] transition-colors"
            />
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowFullEmojiPicker(!showFullEmojiPicker)}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white/50">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
              </button>
              <AnimatePresence>
                {showFullEmojiPicker && (
                  <div className="fixed bottom-20 left-0 right-0 mx-auto w-[340px] px-4 z-30">
                    <EmojiPicker
                      onSelect={(emoji) => {
                        setText((prev) => prev + emoji);
                        setShowFullEmojiPicker(false);
                        inputRef.current?.focus();
                      }}
                      onClose={() => setShowFullEmojiPicker(false)}
                    />
                  </div>
                )}
              </AnimatePresence>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="submit"
              disabled={(!text.trim() && !previewFile) || uploading}
              className="shrink-0 w-9 h-9 rounded-full bg-romantic-gradient flex items-center justify-center disabled:opacity-20 transition-all duration-200 shadow-[0_2px_12px_rgba(139,92,246,0.3)] disabled:shadow-none"
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

          {/* GIF picker */}
          <AnimatePresence>
            {showGifPicker && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="max-w-md mx-auto mt-2"
              >
                <GifPicker
                  onSelect={(emoji) => {
                    setText((prev) => prev + emoji);
                    setShowGifPicker(false);
                    inputRef.current?.focus();
                  }}
                  onClose={() => setShowGifPicker(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
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
      </main>

      {/* Message Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <MessageContextMenu
            position={contextMenu.position}
            items={[
              { icon: '↩️', label: 'Reply', onClick: () => setReplyingTo(contextMenu.msg) },
              { icon: '❤️', label: 'React', onClick: () => handleReact(contextMenu.msg._id, '❤️') },
              { icon: '📋', label: 'Info', onClick: () => setMessageInfo(contextMenu.msg) },
              { icon: '🗑️', label: 'Delete', onClick: () => handleDelete(contextMenu.msg._id), danger: true },
            ]}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>

      {/* Location Share */}
      <AnimatePresence>
        {showLocationShare && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-6"
            onClick={() => setShowLocationShare(false)}
          >
            <LocationShare
              onSend={async (loc) => {
                const text = loc.label
                  ? `${loc.label}: https://maps.google.com/?q=${loc.lat},${loc.lng}`
                  : `https://maps.google.com/?q=${loc.lat},${loc.lng}`;
                try { await api.post('/chat/messages', { text }); } catch {}
                setShowLocationShare(false);
              }}
              onClose={() => setShowLocationShare(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Info */}
      <AnimatePresence>
        {messageInfo && (
          <MessageInfo
            readBy={messageInfo.read ? [messageInfo.sender._id] : []}
            deliveredTo={[messageInfo.sender._id]}
            partnerName={partnerName}
            sentAt={messageInfo.createdAt}
            onClose={() => setMessageInfo(null)}
          />
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
