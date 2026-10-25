'use client';

import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, KeyRound, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AgentAvatar, MapTile } from './agent-avatar';
import { useVantsnet } from '@/lib/store';
import type { ProfileResponse } from '@/lib/valorant/types';

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES').format(n);
}

export function ProfileView({ profile, loading }: { profile: ProfileResponse | null; loading: boolean }) {
  const goHome = useVantsnet((s) => s.goHome);
  const openMatch = useVantsnet((s) => s.openMatch);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-8">
        <Skeleton className="h-8 w-40 bg-slate-800" />
        <Skeleton className="h-32 w-full rounded-xl bg-slate-800" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-slate-800" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl bg-slate-800" />
      </div>
    );
  }
  if (!profile) return null;

  const { player, aggregate, agents, matches } = profile;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-8">
      <Button variant="ghost" onClick={goHome} className="text-slate-400 hover:text-white -ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Buscar otro jugador
      </Button>

      {/* Cabecera del jugador */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-[#FF4655]/20 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FF4655] text-2xl font-black text-white">
            {player.gameName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-black text-white sm:text-3xl">
              {player.gameName}
              <span className="text-slate-400">#{player.tagLine}</span>
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 font-semibold text-slate-300">
                {player.region === 'europe' ? 'Europa' : player.region === 'americas' ? 'América' : 'Asia'}
              </span>
              {profile.demo && (
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-semibold text-emerald-300">
                  Datos de demo
                </span>
              )}
              <span className="text-slate-500">últimas {aggregate.matches} partidas</span>
            </div>
          </div>
        </div>
      </div>

      {profile.demo && <DemoBanner />}

      {/* Stats agregadas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Winrate" value={`${aggregate.winrate}%`} sub={`${aggregate.wins}V · ${aggregate.matches - aggregate.wins}D`} accent={aggregate.winrate >= 50} />
        <StatCard label="K/D" value={aggregate.kd.toFixed(2)} sub={`${fmt(aggregate.kills)} / ${fmt(aggregate.deaths)} / ${fmt(aggregate.assists)}`} />
        <StatCard label="ACS" value={fmt(aggregate.acs)} sub="puntuación media/round" />
        <StatCard label="ADR" value={fmt(aggregate.adr)} sub="daño medio/round" />
        <StatCard label="HS %" value={`${aggregate.hsPct}%`} sub="precisión de cabeza" />
      </div>

      {/* Agentes */}
      {agents.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">Agentes jugados</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((a) => (
              <div key={a.name} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <AgentAvatar name={a.name} uuid={a.uuid} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-bold text-white">{a.name}</span>
                    <span className="text-xs text-slate-500">{a.matches} part.</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className={a.winrate >= 50 ? 'font-semibold text-emerald-400' : 'font-semibold text-rose-400'}>
                      {a.winrate}% WR
                    </span>
                    <span className="text-slate-400">K/D {a.kd.toFixed(2)}</span>
                    <span className="text-slate-500">{fmt(a.kills)}/{fmt(a.deaths)}/{fmt(a.assists)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Historial */}
      <section>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
          Historial de partidas
        </h3>
        <div className="space-y-2">
          {matches.map((m) => (
            <button
              key={m.externalId}
              onClick={() => openMatch(m.externalId)}
              className="group flex w-full items-center gap-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-left transition-colors hover:border-slate-600 hover:bg-slate-800/60"
            >
              <span className={`h-12 w-1 shrink-0 rounded-full ${m.won ? 'bg-emerald-500' : 'bg-rose-500'}`} aria-hidden />
              <MapTile name={m.mapName} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-bold text-white">{m.mapName}</span>
                  <span className="hidden text-xs text-slate-500 sm:inline">{m.modeLabel}</span>
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {formatDistanceToNow(new Date(m.playedAt), { addSuffix: true, locale: es })}
                  {' · '}{Math.round(m.durationMs / 60000)} min
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <AgentAvatar name={m.agentName} uuid={m.agentUuid} size={36} />
                <div className="text-right">
                  <div className={`text-sm font-black ${m.won ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {m.won ? 'Victoria' : 'Derrota'} {m.roundsWon}-{m.roundsLost}
                  </div>
                  <div className="text-xs text-slate-400">
                    <span className="font-bold text-white">{m.kills}/{m.deaths}/{m.assists}</span>
                    {' · '}{m.acs} ACS · {m.hsPct}% HS
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'border-emerald-700/50 bg-emerald-500/10' : 'border-slate-800 bg-slate-900/60'}`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-black ${accent ? 'text-emerald-300' : 'text-white'}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export function DemoBanner() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-700/40 bg-emerald-500/10 p-4">
      <Trophy className="h-5 w-5 shrink-0 text-emerald-400" />
      <p className="flex-1 text-sm text-emerald-200">
        Estás viendo <strong>datos simulados</strong>. Añade tu API key de developer de Riot para buscar jugadores reales.
      </p>
      <Button size="sm" variant="outline" className="shrink-0 border-emerald-600/50 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200" disabled>
        <KeyRound className="mr-2 h-3.5 w-3.5" /> Configurar en inicio
      </Button>
    </div>
  );
}
