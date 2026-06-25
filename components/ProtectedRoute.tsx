'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

/**
 * Wrap protected pages with this component.
 * Redirects to /login if not authenticated, or /invite if no active couple.
 */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, couple, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
    } else if (!couple || !couple.hasPartner) {
      router.push('/invite');
    }
  }, [user, couple, loading, router]);

  if (loading || !user || !couple || !couple.hasPartner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/50 text-sm">Loading…</div>
      </div>
    );
  }

  return <>{children}</>;
}
