'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '@/lib/api';

interface GifItem {
  id: string;
  url: string;
  preview: string;
  title: string;
}

const TRENDING_GIFS: GifItem[] = [
  { id: '1', url: '', preview: '❤️', title: 'Love' },
  { id: '2', url: '', preview: '😂', title: 'LOL' },
  { id: '3', url: '', preview: '🥰', title: 'Cute' },
  { id: '4', url: '', preview: '🎉', title: 'Celebrate' },
  { id: '5', url: '', preview: '🔥', title: 'Fire' },
  { id: '6', url: '', preview: '👍', title: 'Thumbs Up' },
  { id: '7', url: '', preview: '💔', title: 'Heartbreak' },
  { id: '8', url: '', preview: '🌹', title: 'Rose' },
  { id: '9', url: '', preview: '💕', title: 'Two Hearts' },
  { id: '10', url: '', preview: '✨', title: 'Sparkles' },
  { id: '11', url: '', preview: '🫶', title: 'Heart Hands' },
  { id: '12', url: '', preview: '😘', title: 'Kiss' },
  { id: '13', url: '', preview: '🥺', title: 'Pleading' },
  { id: '14', url: '', preview: '😍', title: 'Heart Eyes' },
  { id: '15', url: '', preview: '😭', title: 'Crying' },
  { id: '16', url: '', preview: '🤝', title: 'Handshake' },
  { id: '17', url: '', preview: '💪', title: 'Strong' },
  { id: '18', url: '', preview: '🎶', title: 'Music' },
  { id: '19', url: '', preview: '🌙', title: 'Moon' },
  { id: '20', url: '', preview: '☕', title: 'Coffee' },
];

interface GifPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [search, setSearch] = useState('');
  const [gifs, setGifs] = useState<GifItem[]>(TRENDING_GIFS);
  const [loading, setLoading] = useState(false);

  const searchGifs = async (query: string) => {
    if (!query.trim()) {
      setGifs(TRENDING_GIFS);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get(`/gifs/search?q=${encodeURIComponent(query)}`);
      if (data.gifs && data.gifs.length > 0) {
        setGifs(data.gifs);
      }
    } catch {
      setGifs(TRENDING_GIFS.filter(g => g.title.toLowerCase().includes(query.toLowerCase())));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => searchGifs(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="glass rounded-2xl overflow-hidden shadow-2xl border border-white/10"
    >
      <div className="px-3 pt-3">
        <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-white/30 shrink-0">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search GIFs..."
            className="bg-transparent text-sm outline-none flex-1 text-white/70 placeholder:text-white/20"
          />
        </div>
      </div>

      <div className="h-48 overflow-y-auto px-2 py-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="w-5 h-5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {gifs.map((gif) => (
              <motion.button
                key={gif.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (gif.url) {
                    onSelect(gif.url);
                  } else {
                    onSelect(gif.preview);
                  }
                  onClose();
                }}
                className="aspect-square rounded-xl bg-white/5 flex items-center justify-center text-3xl hover:bg-white/10 transition-colors overflow-hidden"
              >
                {gif.url ? (
                  <img src={gif.url} alt={gif.title} className="w-full h-full object-cover" />
                ) : (
                  gif.preview
                )}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
