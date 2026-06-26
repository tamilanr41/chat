'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';
import BottomNav from '@/components/BottomNav';
import FloatingParticles from '@/components/FloatingParticles';
import api from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

interface Memory {
  _id: string;
  title: string;
  description: string;
  date: string;
  image?: string;
  addedBy: { _id: string; name: string; nickname?: string };
}

const rotations = ['-2.5deg', '1.8deg', '-0.8deg', '3.2deg', '-3.8deg', '0.5deg', '-1.5deg', '2.2deg'];

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await api.get('/memories');
    setMemories(data.memories);
  };

  useEffect(() => {
    load();
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    setUploading(true);
    try {
      let image = '';
      if (previewFile) {
        const formData = new FormData();
        formData.append('image', previewFile);
        const { data: uploadData } = await api.post('/memory/upload', formData);
        image = uploadData.imageUrl;
      }

      const { data } = await api.post('/memories', { title, description, date, image });
      setMemories((prev) => [...prev, data.memory].sort((a, b) => a.date.localeCompare(b.date)));
      setTitle('');
      setDescription('');
      setDate('');
      setPreviewUrl(null);
      setPreviewFile(null);
      setShowForm(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not add memory.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/memories/${id}`);
    setMemories((prev) => prev.filter((m) => m._id !== id));
  };

  return (
    <ProtectedRoute>
      <main className="relative min-h-screen px-4 pt-8 pb-28 overflow-hidden">
        <FloatingParticles />

        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl gradient-text">Our Memories</h1>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowForm((s) => !s)}
            className="px-4 py-2 rounded-xl bg-romantic-gradient text-sm font-medium"
          >
            {showForm ? 'Cancel' : '+ Add'}
          </motion.button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAdd}
              className="glass rounded-3xl p-5 mb-6 flex flex-col gap-3 overflow-hidden"
            >
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (e.g. Our first date)"
                required
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-primary/60"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this memory…"
                rows={3}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-primary/60 resize-none"
              />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-primary/60"
              />

              {/* Image upload */}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageSelect}
                className="hidden"
              />
              {previewUrl ? (
                <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-white/10">
                  <img
                    src={previewUrl}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => { setPreviewUrl(null); setPreviewFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-xs"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-2 rounded-xl border border-dashed border-white/20 text-sm text-white/40 hover:text-white/60"
                >
                  + Add photo
                </button>
              )}

              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={uploading}
                className="py-2 rounded-xl bg-romantic-gradient text-sm font-medium disabled:opacity-40"
              >
                {uploading ? 'Saving...' : 'Save memory'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Polaroid Wall */}
        {memories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
            <span className="text-5xl mb-2 animate-pulse">📸</span>
            <p className="text-white/40 text-sm">No memories yet.</p>
            <p className="text-white/20 text-xs">Add your first one! 💌</p>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-10 pb-10">
            {memories.map((memory, i) => {
              const rot = rotations[i % rotations.length];
              return (
                <motion.div
                  key={memory._id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, type: 'spring', stiffness: 120 }}
                  style={{ transform: `rotate(${rot})` }}
                  className="relative shrink-0"
                >
                  {/* Pin */}
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
                    <div className="relative">
                      <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-red-300 to-red-500 shadow-[0_1px_4px_rgba(0,0,0,0.4)]" />
                      <div className="absolute inset-[3px] rounded-full bg-gradient-to-br from-white/40 to-transparent" />
                    </div>
                    {/* String line */}
                    <div className="w-[1.5px] h-6 bg-gradient-to-b from-gray-400/40 to-transparent" />
                  </div>

                  {/* Polaroid card */}
                  <div
                    className="bg-white rounded-[1px] p-[10px] pb-[22px] w-44 sm:w-52 relative"
                    style={{
                      boxShadow:
                        '0 2px 8px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.18)',
                    }}
                  >
                    {/* Photo area with text overlay */}
                    {memory.image ? (
                      <div className="w-full aspect-square overflow-hidden bg-gray-100 relative">
                        <img
                          src={`${API_BASE}${memory.image}`}
                          alt={memory.title}
                          className="w-full h-full object-cover"
                        />
                        {/* Title on image - handwritten */}
                        <h3 className="absolute bottom-8 left-3 right-3 text-lg text-white leading-tight truncate" style={{ fontFamily: 'var(--font-handwrite)', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
                          {memory.title}
                        </h3>
                        {/* Date on image */}
                        <p className="absolute bottom-2 left-3 text-xs text-white/90" style={{ fontFamily: 'var(--font-handwrite)', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
                          {new Date(memory.date).toLocaleDateString([], {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                        {/* Added by on image */}
                        <p className="absolute bottom-2 right-3 text-[11px] text-white/70" style={{ fontFamily: 'var(--font-handwrite)', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
                          ~ {memory.addedBy?.nickname || memory.addedBy?.name}
                        </p>
                      </div>
                    ) : (
                      <div className="w-full aspect-square bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/10 flex items-center justify-center">
                        <span className="text-4xl">💕</span>
                      </div>
                    )}

                    {/* Description below image */}
                    {memory.description && (
                      <p className="mt-1.5 text-[10px] text-gray-500 text-center leading-tight px-1 italic">
                        {memory.description}
                      </p>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(memory._id)}
                      className="absolute bottom-1 right-1.5 text-[9px] text-gray-300 hover:text-red-400 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <BottomNav />
      </main>
    </ProtectedRoute>
  );
}
