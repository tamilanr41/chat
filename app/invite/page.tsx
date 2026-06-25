'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import FloatingParticles from '@/components/FloatingParticles';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';

export default function InvitePage() {
  const { couple, setCouple, refresh, loading: authLoading, user } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [inviteCode, setInviteCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (couple?.hasPartner) {
      router.push('/dashboard');
    } else if (couple?.inviteCode) {
      setMode('create');
      setInviteCode(couple.inviteCode);
    }
  }, [couple, router]);

  // Poll for partner joining when we're in "create" mode
  useEffect(() => {
    if (mode !== 'create') return;
    const interval = setInterval(async () => {
      await refresh();
    }, 4000);
    return () => clearInterval(interval);
  }, [mode, refresh]);

  const handleCreate = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/couple/create');
      setCouple({ ...data });
      setInviteCode(data.inviteCode);
      setMode('create');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/couple/join', { inviteCode: joinCode.trim() });
      setCouple({ ...data });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
      <FloatingParticles />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass rounded-3xl p-8 w-full max-w-sm text-center"
      >
        {mode === 'choose' && (
          <>
            <div className="text-5xl mb-4">🔗</div>
            <h1 className="font-display text-2xl mb-2 gradient-text">Connect with your person</h1>
            <p className="text-white/50 text-sm mb-6">
              Create a new invite code, or join your partner using the code they shared with you.
            </p>

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            <div className="flex flex-col gap-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleCreate}
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-romantic-gradient font-medium shadow-glow disabled:opacity-60"
              >
                {loading ? 'Creating…' : 'Generate invite code'}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setMode('join')}
                className="w-full py-3 rounded-2xl glass font-medium"
              >
                I have an invite code
              </motion.button>
            </div>
          </>
        )}

        {mode === 'create' && (
          <>
            <div className="text-5xl mb-4">💌</div>
            <h1 className="font-display text-2xl mb-2 gradient-text">Share this code</h1>
            <p className="text-white/50 text-sm mb-6">
              Send this code to your partner so they can join your private space.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-2xl py-4 px-6 mb-4">
              <span className="text-2xl font-mono tracking-widest text-primary-light">
                {inviteCode}
              </span>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleCopy}
              className="w-full py-3 rounded-2xl glass font-medium mb-3"
            >
              {copied ? 'Copied! ✓' : 'Copy code'}
            </motion.button>

            <p className="text-white/40 text-xs flex items-center justify-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
              Waiting for your partner to join…
            </p>
          </>
        )}

        {mode === 'join' && (
          <>
            <div className="text-5xl mb-4">💞</div>
            <h1 className="font-display text-2xl mb-2 gradient-text">Enter invite code</h1>
            <p className="text-white/50 text-sm mb-6">
              Enter the code your partner shared with you to join their space.
            </p>

            <form onSubmit={handleJoin} className="flex flex-col gap-4">
              <input
                type="text"
                required
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center font-mono tracking-widest text-sm outline-none focus:border-primary/60 transition"
                placeholder="LOVE-XXXXXX"
              />

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-romantic-gradient font-medium shadow-glow disabled:opacity-60"
              >
                {loading ? 'Joining…' : 'Join'}
              </motion.button>
            </form>

            <button
              onClick={() => setMode('choose')}
              className="text-white/40 text-sm mt-4 underline"
            >
              Back
            </button>
          </>
        )}
      </motion.div>
    </main>
  );
}
