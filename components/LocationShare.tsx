'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '@/lib/api';

interface LocationShareProps {
  onSend: (location: { lat: number; lng: number; label?: string }) => void;
  onClose: () => void;
}

export default function LocationShare({ onSend, onClose }: LocationShareProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      () => {
        setError('Unable to get your location');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleSend = (label?: string) => {
    if (location) {
      onSend({ ...location, label });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="glass rounded-2xl p-4 shadow-2xl border border-white/10 max-w-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white/70">Share Location</h3>
        <button onClick={onClose} className="text-white/30 hover:text-white/60 text-xs">Cancel</button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-6 gap-3">
          <span className="w-6 h-6 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-white/40">Getting your location...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center py-6 gap-3">
          <span className="text-2xl">📍</span>
          <p className="text-xs text-white/40 text-center">{error}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Mini map placeholder */}
          <div className="w-full h-32 rounded-xl bg-white/5 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0" style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(255,93,143,0.1), transparent 60%)',
            }} />
            <div className="relative text-center">
              <span className="text-3xl">📍</span>
              <p className="text-[10px] text-white/30 mt-1">{location?.lat.toFixed(4)}, {location?.lng.toFixed(4)}</p>
            </div>
          </div>

          <button
            onClick={() => handleSend('Current Location')}
            className="w-full py-2.5 rounded-xl bg-romantic-gradient text-sm font-medium flex items-center justify-center gap-2"
          >
            <span>📍</span>
            <span>Send Current Location</span>
          </button>

          <button
            onClick={() => handleSend('Live Location')}
            className="w-full py-2.5 rounded-xl glass text-sm font-medium text-white/60 flex items-center justify-center gap-2 hover:bg-white/5"
          >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span>Share Live Location (15 min)</span>
          </button>
        </div>
      )}
    </motion.div>
  );
}
