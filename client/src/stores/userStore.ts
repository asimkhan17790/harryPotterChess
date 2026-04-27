import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { Profile, GameRecordPayload, UserStats } from '../../../shared/src/index';

interface UserState {
  user: User | null;
  profile: Profile | null;
  stats: UserStats | null;
  isLoading: boolean;
  isProfileOpen: boolean;

  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setStats: (stats: UserStats | null) => void;
  setLoading: (loading: boolean) => void;
  openProfile: () => void;
  closeProfile: () => void;

  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  fetchStats: (userId: string) => Promise<void>;
  syncHouseToProfile: (house: string) => Promise<void>;
  saveGameRecord: (payload: GameRecordPayload) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  profile: null,
  stats: null,
  isLoading: false,
  isProfileOpen: false,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setStats: (stats) => set({ stats }),
  setLoading: (isLoading) => set({ isLoading }),
  openProfile: () => set({ isProfileOpen: true }),
  closeProfile: () => set({ isProfileOpen: false }),

  signInWithGoogle: async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, stats: null });
  },

  fetchProfile: async (userId: string) => {
    const { user } = get();
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      set({ profile: data as Profile });
    } else if (user) {
      // Trigger missed or user pre-existed — upsert from Google metadata
      const { data: created, error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          display_name: user.user_metadata?.full_name ?? '',
          avatar_url: user.user_metadata?.avatar_url ?? null,
        })
        .select()
        .single();
      if (upsertError) console.error('[userStore] profile upsert failed:', upsertError);
      if (created) set({ profile: created as Profile });
    } else {
      if (error) console.error('[userStore] profile fetch failed:', error);
    }
    await get().fetchStats(userId);
  },

  fetchStats: async (userId: string) => {
    const { data } = await supabase.from('user_stats').select('*').eq('user_id', userId).single();
    if (data) set({ stats: data as UserStats });
  },

  syncHouseToProfile: async (house: string) => {
    const { user } = get();
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .update({ house, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();
    if (data) set({ profile: data as Profile });
  },

  saveGameRecord: async (payload: GameRecordPayload) => {
    const { user } = get();
    if (!user) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        const newToken = refreshed.session?.access_token;
        if (!newToken) return;
        await fetch(`${apiUrl}/api/games`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${newToken}`,
          },
          body: JSON.stringify(payload),
        });
      }

      await get().fetchStats(user.id);
    } catch {
      // Silent — guest-like experience if network fails
    }
  },
}));
