'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import FloatingParticles from '@/components/FloatingParticles';

export default function SplashPage() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      <FloatingParticles />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="flex flex-col items-center"
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-6xl mb-4"
        >
          💞
        </motion.div>

        <h1 className="font-display text-4xl sm:text-5xl mb-3 gradient-text drop-shadow-lg">
          Just For Two
        </h1>
        <p className="text-white/80 max-w-sm mb-10 drop-shadow-md">
          A private, invite-only space made for the two of you — chats, memories,
          and little rituals that are yours alone.
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link href="/signup">
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-2xl bg-romantic-gradient font-medium shadow-glow"
            >
              Create your space
            </motion.button>
          </Link>
          <Link href="/login">
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-2xl glass font-medium"
            >
              I already have an account
            </motion.button>
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
