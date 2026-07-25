'use client';

import { motion } from 'framer-motion';

export interface ContextMenuItem {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface MessageContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

export default function MessageContextMenu({ items, position, onClose }: MessageContextMenuProps) {
  return (
    <>
      <div className="fixed inset-0 z-[80]" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -10 }}
        className="fixed z-[85] glass rounded-2xl shadow-2xl border border-white/10 overflow-hidden min-w-[180px]"
        style={{ left: Math.min(position.x, window.innerWidth - 200), top: Math.min(position.y, window.innerHeight - 300) }}
      >
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => { item.onClick(); onClose(); }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/10 ${
              item.danger ? 'text-red-400' : 'text-white/70'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </motion.div>
    </>
  );
}
