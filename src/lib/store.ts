// Estado global de la app: vistas (buscador / perfil / partida) + datos + API key
'use client';

import { create } from 'zustand';
import type { MatchDetailResponse, ProfileResponse } from '@/lib/valorant/types';

export type View = 'home' | 'profile' | 'match';

interface VantsnetState {
  view: View;
  profile: ProfileResponse | null;
  matchDetail: MatchDetailResponse | null;
  loading: boolean;
  error: string | null;
  lastSearch: { riotId: string; region: string } | null;
  apiKey: string;

  setApiKey: (key: string) => void;
  loadApiKey: () => void;
  search: (riotId: string, region: string) => Promise<void>;
  openMatch: (matchId: string) => Promise<void>;
  goHome: () => void;
  backToProfile: () => void;
  clearError: () => void;
}

export const useVantsnet = create<VantsnetState>((set, get) => ({
  view: 'home',
  profile: null,
  matchDetail: null,
  loading: false,
  error: null,
  lastSearch: null,
  apiKey: '',

  setApiKey: (key) => {
    if (typeof window !== 'undefined') {
      if (key) window.localStorage.setItem('vantsnet-riot-key', key);
      else window.localStorage.removeItem('vantsnet-riot-key');
    }
    set({ apiKey: key });
  },

  loadApiKey: () => {
    if (typeof window !== 'undefined') {
      set({ apiKey: window.localStorage.getItem('vantsnet-riot-key') ?? '' });
    }
  },

  clearError: () => set({ error: null }),

  search: async (riotId, region) => {
    const { apiKey } = get();
    set({ loading: true, error: null, view: 'profile', profile: null, matchDetail: null, lastSearch: { riotId, region } });
    try {
      const res = await fetch(
        `/api/valorant/profile?riotId=${encodeURIComponent(riotId)}&region=${encodeURIComponent(region)}`,
        { headers: apiKey ? { 'x-riot-key': apiKey } : {} }
      );
      const data = await res.json();
      if (!res.ok) {
        set({ loading: false, error: data.error ?? 'Error al buscar el jugador.', view: 'home' });
        return;
      }
      set({ loading: false, profile: data as ProfileResponse });
    } catch {
      set({ loading: false, error: 'No se pudo conectar con el servidor. Inténtalo de nuevo.', view: 'home' });
    }
  },

  openMatch: async (matchId) => {
    const { apiKey, lastSearch } = get();
    set({ loading: true, error: null, view: 'match', matchDetail: null });
    try {
      const region = lastSearch?.region ?? 'europe';
      const res = await fetch(
        `/api/valorant/match/${encodeURIComponent(matchId)}?region=${encodeURIComponent(region)}`,
        { headers: apiKey ? { 'x-riot-key': apiKey } : {} }
      );
      const data = await res.json();
      if (!res.ok) {
        set({ loading: false, error: data.error ?? 'Error al cargar la partida.' });
        return;
      }
      set({ loading: false, matchDetail: data as MatchDetailResponse });
    } catch {
      set({ loading: false, error: 'No se pudo conectar con el servidor. Inténtalo de nuevo.' });
    }
  },

  goHome: () => set({ view: 'home', error: null }),

  backToProfile: () => set({ view: 'profile', error: null }),
}));
