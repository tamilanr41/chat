'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    icon: '😀',
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗',
      '😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','😐','😑','😶',
      '😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵',
      '🥶','🥴','😵','🤯','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳',
      '🥺','🥹','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫',
      '🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾',
    ],
  },
  {
    name: 'Hearts',
    icon: '❤️',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞',
      '💓','💗','💖','💘','💝','💟','♥️','🫶','💑','💏','💋','💐','🌹','🥀','💍','💒',
    ],
  },
  {
    name: 'Gestures',
    icon: '👋',
    emojis: [
      '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆',
      '👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','💪',
    ],
  },
  {
    name: 'Animals',
    icon: '🐶',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈',
      '🙉','🙊','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🐺','🐴','🦄','🐝','🐛',
      '🦋','🐌','🐞','🐜','🐢','🐍','🦎','🐙','🦑','🦐','🦀','🐠','🐟','🐬','🐳','🐋',
    ],
  },
  {
    name: 'Food',
    icon: '🍔',
    emojis: [
      '🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝',
      '🍅','🍆','🥑','🥦','🥒','🌶️','🌽','🥕','🧄','🧅','🥔','🥐','🍞','🧀','🥚','🍳',
      '🍔','🍟','🍕','🥪','🌮','🌯','🥗','🍝','🍜','🍦','🍩','🍪','🎂','🍰','🧁','🍫',
    ],
  },
  {
    name: 'Activities',
    icon: '⚽',
    emojis: [
      '⚽','🏀','🏈','⚾','🎾','🏐','🎱','🏓','🏸','⛳','🎯','🎮','🎲','🧩','🎭','🎨',
      '🎵','🎶','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🎸','🎻','🎬','📸','🏆','🥇','🥈',
    ],
  },
  {
    name: 'Travel',
    icon: '✈️',
    emojis: [
      '🚗','🚕','🚙','🚌','🏎️','🚓','🚑','🚒','🚐','🚚','🚛','🏍️','🚲','✈️','🛫','🛬',
      '🛩️','🚀','🛸','🚁','⛵','🚤','🚢','🗼','🏰','🏯','🎡','🎢','🎠','⛲','🏖️','🌍',
    ],
  },
  {
    name: 'Objects',
    icon: '💡',
    emojis: [
      '⌚','📱','💻','🖥️','📷','📸','📹','🎥','📞','☎️','📺','📻','⏰','⏱️','🔋','🔌',
      '💡','🔦','🕯️','💰','💳','💎','🔑','🗝️','🔒','🔓','📦','🏷️','📝','✏️','📎','✂️',
    ],
  },
  {
    name: 'Symbols',
    icon: '✨',
    emojis: [
      '✨','🌟','💫','⭐','🔥','💥','🎉','🎊','🎈','🎀','🎁','🏆','🔴','🟠','🟡','🟢',
      '🔵','🟣','⚫','⚪','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎',
      '♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴',
    ],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState('');

  const filteredEmojis = useMemo(() => {
    if (!search) return EMOJI_CATEGORIES[activeCategory].emojis;
    const all = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
    return all;
  }, [activeCategory, search]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="glass rounded-2xl overflow-hidden shadow-2xl border border-white/10"
    >
      {/* Category tabs */}
      <div className="flex gap-1 px-2 pt-2 overflow-x-auto no-scrollbar">
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button
            key={cat.name}
            onClick={() => { setActiveCategory(i); setSearch(''); }}
            className={`shrink-0 px-2 py-1 rounded-lg text-sm transition-colors ${
              activeCategory === i ? 'bg-primary/20 text-primary-light' : 'text-white/40 hover:text-white/60'
            }`}
          >
            {cat.icon}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="h-48 overflow-y-auto px-2 py-2">
        <div className="grid grid-cols-8 gap-0.5">
          {filteredEmojis.map((emoji, i) => (
            <motion.button
              key={`${emoji}-${i}`}
              whileTap={{ scale: 1.4 }}
              onClick={() => onSelect(emoji)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-lg"
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Frequently used / search */}
      <div className="px-2 pb-2">
        <div className="flex items-center gap-1 bg-white/5 rounded-xl px-3 py-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 text-white/30">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search emoji..."
            className="bg-transparent text-xs outline-none flex-1 text-white/70 placeholder:text-white/20"
          />
        </div>
      </div>
    </motion.div>
  );
}
