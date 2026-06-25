'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import FloatingParticles from '@/components/FloatingParticles';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
      <FloatingParticles />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass rounded-3xl p-8 w-full max-w-sm"
      >
        <h1 className="font-display text-3xl mb-1 gradient-text">Welcome back</h1>
        <p className="text-white/50 text-sm mb-6">Sign in to your private space.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-white/60 mb-1 block">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/60 transition"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-xs text-white/60 mb-1 block">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/60 transition"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-romantic-gradient font-medium shadow-glow disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </motion.button>
        </form>

        <p className="text-center text-white/50 text-sm mt-6">
          New here?{' '}
          <Link href="/signup" className="text-primary-light">
            Create an account
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
