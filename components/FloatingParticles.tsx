'use client';

import { useEffect, useState } from 'react';

interface Particle {
  size: number;
  left: string;
  top: string;
  delay: string;
  isAccent: boolean;
}

export default function FloatingParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const items: Particle[] = Array.from({ length: 12 }, (_, i) => ({
      size: 4 + Math.random() * 10,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 8}s`,
      isAccent: i % 2 === 0,
    }));
    setParticles(items);
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
      {particles.map((p, i) => (
        <div
          key={i}
          className="particle absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: p.left,
            top: p.top,
            background: p.isAccent
              ? 'rgba(96, 165, 250, 0.4)'
              : 'rgba(59, 130, 246, 0.4)',
            animationDelay: p.delay,
            filter: 'blur(1px)',
          }}
        />
      ))}
    </div>
  );
}
