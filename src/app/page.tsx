'use client';

import { useEffect } from 'react';
import { AlertTriangle, Github, KeyRound, Loader2 } from 'lucide-react';
import { SearchView } from '@/components/vantsnet/search-view';
import { ProfileView } from '@/components/vantsnet/profile-view';
import { MatchView } from '@/components/vantsnet/match-view';
import { useVantsnet } from '@/lib/store';

export default function Home() {
  const view = useVantsnet((s) => s.view);
  const profile = useVantsnet((s) => s.profile);
  const matchDetail = useVantsnet((s) => s.matchDetail);
  const loading = useVantsnet((s) => s.loading);
  const error = useVantsnet((s) => s.error);
  const clearError = useVantsnet((s) => s.clearError);
  const loadApiKey = useVantsnet((s) => s.loadApiKey);
  const apiKey = useVantsnet((s) => s.apiKey);

  useEffect(() => {
    loadApiKey();
  }, [loadApiKey]);

  return (
    <div className="flex min-h-screen flex-col bg-[#0B1120] text-slate-100">
      {/* Cabecera */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#0B1120]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <button
            onClick={() => useVantsnet.getState().goHome()}
            className="flex items-center gap-2 text-lg font-black tracking-tight text-white"
          >
            VANTS<span className="text-[#FF4655]">NET</span>
            <span className="hidden rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:inline">
              valorant stats
            </span>
          </button>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/feispla/VANTSNET"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition-colors hover:text-white"
              aria-label="Repositorio de VANTSNET en GitHub"
            >
              <Github className="h-4 w-4" /> feispla/VANTSNET
            </a>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {view === 'home' && <SearchView />}
        {view === 'profile' && (
          <ProfileView profile={profile} loading={loading} />
        )}
        {view === 'match' && (
          <MatchView
            match={matchDetail}
            loading={loading}
            highlightPuuid={profile?.player.puuid}
          />
        )}
      </main>

      {/* Error global */}
      {error && (
        <div
          role="alert"
          className="fixed inset-x-0 bottom-20 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-xl items-start gap-3 rounded-xl border border-rose-800 bg-slate-900 p-4 shadow-2xl"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
          <p className="flex-1 text-sm leading-relaxed text-slate-200">{error}</p>
          <button
            onClick={clearError}
            className="text-xs font-bold text-slate-400 hover:text-white"
            aria-label="Cerrar error"
          >
            CERRAR
          </button>
        </div>
      )}

      {loading && (
        <div className="pointer-events-none fixed inset-x-0 top-14 z-50 flex justify-center">
          <div className="flex items-center gap-2 rounded-full bg-slate-900/95 px-4 py-2 text-xs font-semibold text-slate-300 shadow-lg ring-1 ring-slate-700">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF4655]" />
            Consultando datos...
          </div>
        </div>
      )}

      {/* Pie fijo abajo */}
      <footer className="mt-auto border-t border-slate-800/80 bg-[#0B1120] pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-2 px-4 py-4 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-slate-500">
            <span className="font-bold text-slate-400">VANTSNET</span> · Prototipo de red de estadísticas gaming
          </p>
          <p className="text-[11px] leading-relaxed text-slate-600">
            No afiliado a Riot Games. Datos: API oficial de Valorant.
            {apiKey ? ' Clave de developer activa.' : ' Modo demo disponible.'}
          </p>
        </div>
      </footer>
    </div>
  );
}
