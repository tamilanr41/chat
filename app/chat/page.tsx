'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
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
  type: 'text' | 'image' | 'audio' | 'sticker';
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

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
}: {
  msg: Message;
  isMine: boolean;
  isConsecutive: boolean;
  onReply: (m: Message) => void;
  onReact: (id: string, emoji: string) => void;
  onDelete: (id: string) => void;
  onImageOpen: (url: string) => void;
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef(0);

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowActions(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    const now = Date.now();
    if (now - lastTap.current < 300) {
      onReact(msg._id, '❤️');
    }
    lastTap.current = now;
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
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={() => {
          longPressTimer.current = setTimeout(() => setShowActions(true), 500);
        }}
        onMouseUp={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
        onMouseLeave={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
      >
        {/* Reply preview */}
        {msg.replyTo && (
          <div
            className={`text-xs px-3 pt-2 pb-1 rounded-t-xl ${
              isMine ? 'bg-white/10' : 'bg-white/5'
            }`}
          >
            <span className="text-primary-light font-medium">
              {msg.replyTo.sender?.name || 'Unknown'}
            </span>
                    <p className="text-white/40 truncate max-w-[120px] sm:max-w-[200px]">{msg.replyTo.text}</p>
          </div>
        )}

        {/* Bubble */}
        <div
          className={`px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
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
          ) : msg.type === 'audio' ? (
            <audio
              src={`${API_BASE}${msg.text}`}
              controls
              className="max-w-full h-10"
              preload="metadata"
            />
          ) : (
            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
          )}

          {/* Time + read receipt */}
          <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
            <span className={`text-[10px] ${isMine ? 'text-white/60' : 'text-white/40'}`}>
              {formatTime(msg.createdAt)}
            </span>
            {isMine && (
              <span className="text-[10px]">
                {msg.read ? '✓✓' : '✓'}
              </span>
            )}
          </div>
        </div>

        {/* Reactions */}
        {reactionSummary && Object.keys(reactionSummary).length > 0 && (
          <div
            className={`flex gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}
          >
            {Object.entries(reactionSummary).map(([emoji, users]) => (
              <button
                key={emoji}
                onClick={() => onReact(msg._id, emoji)}
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  users.includes('self') ? 'bg-primary/20' : 'bg-white/10'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Action popover */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`absolute -top-12 ${isMine ? 'right-0' : 'left-0'} flex gap-1 bg-bg-card border border-white/10 rounded-full px-2 py-1.5 shadow-lg z-10`}
            >
              <button
                onClick={() => { onReact(msg._id, '❤️'); setShowActions(false); }}
                className="hover:scale-125 transition-transform text-sm"
              >
                ❤️
              </button>
              <button
                onClick={() => { onReply(msg); setShowActions(false); }}
                className="hover:scale-125 transition-transform text-sm"
              >
                💬
              </button>
              {isMine && (
                <button
                  onClick={() => { onDelete(msg._id); setShowActions(false); }}
                  className="hover:scale-125 transition-transform text-sm"
                >
                  🗑️
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
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
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [partnerName, setPartnerName] = useState('');
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
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPartner = async () => {
      try {
        const { data } = await api.get('/couple');
        if (data.couple) {
          const partner = data.couple.user1?._id !== user?.id
            ? data.couple.user1
            : data.couple.user2;
          setPartnerName(partner?.nickname || partner?.name || '');
        }
      } catch {}
    };
    fetchPartner();
  }, [user?.id]);

  const loadMessages = async () => {
    try {
      const { data } = await api.get('/chat/messages');
      setMessages(data.messages);
      markAsRead(data.messages);
    } finally {
      setLoading(false);
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
      setPartnerOnline(online.some((id) => id !== user?.id));
    });

    let emojiSlot = 0;
    const emojiTrajectories = [
      { x: 12, startY: 10, driftX: 30, travelY: 280, scaleTarget: 2.5 },
      { x: 78, startY: 15, driftX: -30, travelY: 250, scaleTarget: 2.2 },
      { x: 42, startY: 8, driftX: 20, travelY: 320, scaleTarget: 2.8 },
      { x: 88, startY: 20, driftX: -25, travelY: 220, scaleTarget: 2.0 },
      { x: 25, startY: 12, driftX: 30, travelY: 300, scaleTarget: 2.4 },
      { x: 60, startY: 8, driftX: -20, travelY: 280, scaleTarget: 2.6 },
      { x: 50, startY: 15, driftX: 0, travelY: 350, scaleTarget: 3.0 },
      { x: 35, startY: 10, driftX: 25, travelY: 260, scaleTarget: 2.0 },
    ];
    socket.on('receive:emoji', ({ emoji }: { emoji: string }) => {
      const id = Date.now() + Math.random();
      const t = emojiTrajectories[emojiSlot % emojiTrajectories.length];
      emojiSlot++;
      const delay = (emojiSlot % 4) * 0.2;
      setFloatingEmojis((prev) => [...prev, { id, emoji, x: t.x, startY: t.startY, delay, driftX: t.driftX, travelY: t.travelY, scaleTarget: t.scaleTarget }]);
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

  const handleReaction = (emoji: string) => {
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
          <div className="w-10 h-10 rounded-full bg-romantic-gradient flex items-center justify-center text-lg font-bold shrink-0">
            {partnerOnline ? '💕' : '💔'}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-lg gradient-text truncate">{partnerName || 'Our Chat'}</h1>
              <p className="text-xs text-white/40 truncate">
                {partnerTyping
                  ? 'typing...'
                  : partnerOnline
                    ? 'Online'
                    : 'Offline'}
              </p>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={chatRef}
          className="flex-1 px-3 pt-3 pb-44 overflow-y-auto flex flex-col"
        >
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
                    <button type="button" onClick={() => { setShowAttachMenu(false); if (!isRecording) startRecording(); else stopRecording(); }} className="flex flex-col items-center gap-0.5 p-2 hover:bg-white/10 rounded-xl transition-colors">
                      <span className="text-lg">{isRecording ? '⏹️' : '🎤'}</span>
                      <span className="text-[9px] text-white/40">{isRecording ? 'Stop' : 'Voice'}</span>
                    </button>
                    <button type="button" onClick={() => { setShowStickerPicker(!showStickerPicker); setShowAttachMenu(false); }} className="flex flex-col items-center gap-0.5 p-2 hover:bg-white/10 rounded-xl transition-colors">
                      <span className="text-lg">🎨</span>
                      <span className="text-[9px] text-white/40">Sticker</span>
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
                    className="absolute bottom-full mb-2 right-0 glass rounded-2xl px-3 py-2 shadow-lg"
                  >
                    <div className="grid grid-cols-4 gap-1.5">
                      <button type="button" onClick={handleHug} className="text-xl hover:scale-125 transition-transform">🤗</button>
                      <button type="button" onClick={handleKiss} className="text-xl hover:scale-125 transition-transform">💋</button>
                      <button type="button" onClick={() => handleReaction('❤️')} className="text-xl hover:scale-125 transition-transform">❤️</button>
                      <button type="button" onClick={() => handleReaction('😍')} className="text-xl hover:scale-125 transition-transform">😍</button>
                      <button type="button" onClick={() => handleReaction('🥰')} className="text-xl hover:scale-125 transition-transform">🥰</button>
                      <button type="button" onClick={() => handleReaction('😘')} className="text-xl hover:scale-125 transition-transform">😘</button>
                      <button type="button" onClick={() => handleReaction('💕')} className="text-xl hover:scale-125 transition-transform">💕</button>
                      <button type="button" onClick={() => handleReaction('💖')} className="text-xl hover:scale-125 transition-transform">💖</button>
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

        {/* Floating emoji animation — each with unique trajectory */}
        <AnimatePresence>
          {floatingEmojis.map((e) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 1, y: 0, x: 0, scale: 0.3 }}
              animate={{ opacity: 0, y: e.travelY, x: e.driftX, scale: e.scaleTarget }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, delay: e.delay, ease: 'easeOut' }}
              className="fixed pointer-events-none z-50 text-5xl sm:text-7xl"
              style={{ left: `${e.x}vw`, top: `${e.startY}px` }}
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
    </ProtectedRoute>
  );
}
