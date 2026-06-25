'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';
import BottomNav from '@/components/BottomNav';
import FloatingParticles from '@/components/FloatingParticles';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';

interface CoupleData {
  _id: string;
  user1: { _id: string; name: string; nickname?: string };
  user2: { _id: string; name: string; nickname?: string };
  relationshipStartDate: string | null;
  loveMeter: number;
}

function formatDuration(start: Date) {
  const now = new Date();
  let diff = now.getTime() - start.getTime();
  if (diff < 0) diff = 0;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const remDays = (days % 365) % 30;

  const parts = [];
  if (years) parts.push(`${years}y`);
  if (months) parts.push(`${months}m`);
  parts.push(`${remDays}d`);
  return parts.join(' ');
}

// Animation variants for staggered card entrance
const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: 0.08 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [couple, setCoupleData] = useState<CoupleData | null>(null);
  const [startDateInput, setStartDateInput] = useState('');
  const [error, setError] = useState('');
  const [loveDelta, setLoveDelta] = useState<number | null>(null);
  const [pulseHeart, setPulseHeart] = useState(false);
  const [notes, setNotes] = useState<{ _id: string; text: string; color: string; createdBy: { _id: string; name: string; nickname?: string } }[]>([]);
  const [noteText, setNoteText] = useState('');
  const [noteColor, setNoteColor] = useState('#fff5d0');
  const [emojiAnim, setEmojiAnim] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const coupleRes = await api.get('/couple');
      setCoupleData(coupleRes.data.couple);
    } catch {
      // silent — likely user hasn't paired yet
    }
  };

  useEffect(() => {
    loadData();

    const socket = getSocket();
    if (!socket) return;

    socket.on('note:new', (note: any) => {
      setNotes((prev) => [note, ...prev]);
    });
    socket.on('note:delete', ({ id }: { id: string }) => {
      setNotes((prev) => prev.filter((n) => n._id !== id));
    });

    return () => {
      socket.off('note:new');
      socket.off('note:delete');
    };
  }, []);

  useEffect(() => {
    api.get('/notes').then(({ data }) => setNotes(data.notes)).catch(() => {});
  }, []);

  // Gentle heartbeat pulse loop for the love meter heart icon
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseHeart(true);
      setTimeout(() => setPulseHeart(false), 600);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const partner = couple
    ? couple.user1._id === user?.id
      ? couple.user2
      : couple.user1
    : null;

  const handleAdjustLove = async (delta: number) => {
    try {
      const { data } = await api.post('/couple/love-meter/adjust', { delta });
      setCoupleData((prev) => (prev ? { ...prev, loveMeter: data.loveMeter } : prev));
      setLoveDelta(delta);
      setTimeout(() => setLoveDelta(null), 900);
    } catch {
      // silent fail is fine for a small UI toggle
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    try {
      await api.post('/notes', { text: noteText, color: noteColor });
      setNoteText('');
    } catch {}
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await api.delete(`/notes/${id}`);
    } catch {}
  };

  const NOTE_COLORS = ['#fff5d0', '#ffd6e0', '#d4f0ff', '#d4f5d4', '#ffecd2', '#e8d4ff'];

  const sendEmoji = (emoji: string) => {
    getSocket()?.emit('send:emoji', { emoji });
    setEmojiAnim(emoji);
    setTimeout(() => setEmojiAnim(null), 1200);
  };

  const handleSetStartDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDateInput) return;
    try {
      const { data } = await api.patch('/couple/relationship-start', { date: startDateInput });
      setCoupleData((prev) =>
        prev ? { ...prev, relationshipStartDate: data.relationshipStartDate } : prev
      );
    } catch {
      setError('Could not save the date.');
    }
  };

  return (
    <ProtectedRoute>
      <main className="relative min-h-screen px-5 pt-8 pb-28 overflow-hidden">
        <FloatingParticles />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <p className="text-white/50 text-sm">Welcome back,</p>
            <h1 className="font-display text-2xl gradient-text">
              {user?.nickname || user?.name}{' '}
              <motion.span
                className="inline-block"
                animate={{ scale: [1, 1.25, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                💕
              </motion.span>
            </h1>
          </div>
          <motion.button
            whileTap={{ scale: 0.94 }}
            whileHover={{ scale: 1.03 }}
            onClick={logout}
            className="text-white/40 text-xs glass px-3 py-2 rounded-xl"
          >
            Log out
          </motion.button>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-red-400 text-sm mb-4"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Relationship counter */}
        <motion.div
          custom={0}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.01 }}
          className="glass rounded-3xl p-5 mb-4 text-center relative overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 opacity-0"
            animate={{ opacity: [0, 0.15, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              background:
                'radial-gradient(circle at 50% 0%, rgba(255,93,143,0.5), transparent 60%)',
            }}
          />
          {couple?.relationshipStartDate ? (
            <>
              <p className="text-white/50 text-xs mb-1 relative z-10">Together for</p>
              <motion.p
                key={formatDuration(new Date(couple.relationshipStartDate))}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="font-display text-3xl gradient-text relative z-10"
              >
                {formatDuration(new Date(couple.relationshipStartDate))}
              </motion.p>
            </>
          ) : (
            <form onSubmit={handleSetStartDate} className="flex flex-col gap-3 items-center relative z-10">
              <p className="text-white/60 text-sm">When did your story begin?</p>
              <input
                type="date"
                required
                value={startDateInput}
                onChange={(e) => setStartDateInput(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-primary/60 transition-colors"
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.03 }}
                className="px-5 py-2 rounded-xl bg-romantic-gradient text-sm font-medium"
              >
                Save our date
              </motion.button>
            </form>
          )}
        </motion.div>

        {/* Love meter */}
        <motion.div
          custom={1}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="glass rounded-3xl p-5 mb-4"
        >
          <div className="flex justify-between items-center mb-2">
            <p className="text-white/60 text-sm flex items-center gap-1.5">
              Love meter
              <motion.span
                animate={pulseHeart ? { scale: [1, 1.4, 1] } : {}}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                ❤️
              </motion.span>
            </p>
            <motion.p
              key={couple?.loveMeter}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.4 }}
              className="text-primary-light font-semibold"
            >
              {couple?.loveMeter ?? 50}%
            </motion.p>
          </div>
          <div className="h-3 rounded-full bg-white/10 overflow-hidden mb-3 relative">
            <motion.div
              className="h-full bg-romantic-gradient relative"
              initial={{ width: 0 }}
              animate={{ width: `${couple?.loveMeter ?? 50}%` }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className="absolute inset-0"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                  width: '40%',
                }}
              />
            </motion.div>
          </div>
          <div className="flex gap-2 justify-center relative">
            <motion.button
              whileTap={{ scale: 0.93 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => handleAdjustLove(5)}
              className="flex-1 py-2 rounded-xl glass text-sm"
            >
              +5 ❤️
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.93 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => handleAdjustLove(-5)}
              className="flex-1 py-2 rounded-xl glass text-sm"
            >
              -5
            </motion.button>

            <AnimatePresence>
              {loveDelta !== null && (
                <motion.span
                  initial={{ opacity: 0, y: 0, scale: 0.8 }}
                  animate={{ opacity: 1, y: -28, scale: 1.1 }}
                  exit={{ opacity: 0, y: -40 }}
                  transition={{ duration: 0.8 }}
                  className={`absolute top-0 left-1/2 -translate-x-1/2 font-display text-sm font-semibold pointer-events-none ${
                    loveDelta > 0 ? 'text-primary-light' : 'text-white/50'
                  }`}
                >
                  {loveDelta > 0 ? '+5 💗' : '−5'}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Love note wall */}
        <motion.div
          custom={2}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="glass rounded-3xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/50 text-xs">💌 Love notes</p>
            <span className="text-[10px] text-white/30">{notes.length} notes</span>
          </div>

          <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write a note for your love…"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary/60 transition-colors"
            />
            <motion.button
              whileTap={{ scale: 0.93 }}
              type="submit"
              disabled={!noteText.trim()}
              className="shrink-0 px-3 py-2 rounded-xl bg-romantic-gradient text-xs font-medium disabled:opacity-30"
            >
              Pin
            </motion.button>
          </form>

          {/* Color picker */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {NOTE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNoteColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${noteColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Notes grid */}
          <div className="grid grid-cols-2 gap-2">
            {notes.length === 0 && (
              <p className="col-span-2 text-center text-white/20 text-xs py-6">
                No notes yet. Leave one for your partner! 💕
              </p>
            )}
            {notes.map((note) => {
              const isMine = String(note.createdBy._id) === String(user?.id);
              return (
                <motion.div
                  key={note._id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative rounded-2xl p-3 min-h-[80px] flex flex-col"
                  style={{ backgroundColor: note.color }}
                >
                  <p className="text-xs text-gray-700 whitespace-pre-wrap break-words flex-1">
                    {note.text}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[9px] text-gray-500">
                      {isMine ? 'you' : (note.createdBy.nickname || note.createdBy.name)}
                    </span>
                    {isMine && (
                      <button
                        onClick={() => handleDeleteNote(note._id)}
                        className="text-[10px] text-gray-400 hover:text-red-500 transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Send emoji reaction */}
        <motion.div
          custom={3}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="glass rounded-3xl p-5 text-center"
        >
          <p className="text-white/50 text-xs mb-3">Send a reaction</p>
          <div className="flex gap-3 justify-center">
            {['😍', '❤️', '😂', '😘', '🥰', '😮', '🔥', '💔'].map((emoji) => (
              <motion.button
                key={emoji}
                whileTap={{ scale: 1.4 }}
                whileHover={{ scale: 1.15 }}
                onClick={() => sendEmoji(emoji)}
                className="text-2xl hover:scale-125 transition-transform"
              >
                {emoji}
              </motion.button>
            ))}
          </div>
          {/* Floating reaction */}
          <AnimatePresence>
            {emojiAnim && (
              <motion.span
                key={emojiAnim}
                initial={{ opacity: 1, y: 0, scale: 0.5 }}
                animate={{ opacity: 0, y: -60, scale: 2 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="block text-4xl mt-2 pointer-events-none"
              >
                {emojiAnim}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        <BottomNav />
      </main>
    </ProtectedRoute>
  );
}
