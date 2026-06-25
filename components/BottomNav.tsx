'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/chat', label: 'Chat', icon: '💬' },
  { href: '/memories', label: 'Memories', icon: '📸' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-4">
      <div className="glass rounded-3xl flex justify-around items-center py-2 max-w-md mx-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="relative flex-1">
              <motion.div
                whileTap={{ scale: 0.92 }}
                className="flex flex-col items-center gap-1 py-2"
              >
                <span className="text-xl">{item.icon}</span>
                <span
                  className={`text-xs ${
                    active ? 'text-primary-light font-medium' : 'text-white/50'
                  }`}
                >
                  {item.label}
                </span>
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-romantic-gradient"
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
