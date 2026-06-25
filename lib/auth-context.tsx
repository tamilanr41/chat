'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import api from './api';
import { disconnectSocket } from './socket';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  nickname?: string;
}

interface CoupleInfo {
  id: string;
  inviteCode: string;
  status: 'pending' | 'active';
  hasPartner: boolean;
  relationshipStartDate?: string | null;
  loveMeter?: number;
}

interface AuthContextType {
  user: User | null;
  couple: CoupleInfo | null;
  loading: boolean;
  setCouple: (c: CoupleInfo | null) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [couple, setCouple] = useState<CoupleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setCouple(null);
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setCouple(data.couple);
    } catch {
      setUser(null);
      setCouple(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    setCouple(data.couple);

    if (!data.couple) {
      router.push('/invite');
    } else if (!data.couple.hasPartner) {
      router.push('/invite');
    } else {
      router.push('/dashboard');
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    const { data } = await api.post('/auth/signup', { name, email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    setCouple(null);
    router.push('/invite');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    disconnectSocket();
    setUser(null);
    setCouple(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, couple, loading, setCouple, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
