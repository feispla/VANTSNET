'use client';

import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AgentAvatar } from './agent-avatar';
import { useVantsnet } from '@/lib/store';
import type { MatchDetailResponse, MatchPlayerRow } from '@/lib/valorant/types';

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES').format(n);
}

export function MatchView({
  match,
  loading,
  highlightPuuid,
}: {
  match: MatchDetailResponse | null;
  loading: boolean;
  highlightPuuid?: string;
}) {
  const backToProfile = useVantsnet((s) => s.backToProfile);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-8">
        <Skeleton className="h-8 w-32 bg-slate-800" />
        <Skeleton className="h-24 w-full rounded-xl bg-slate-800" />
        <Skeleton className="h-72 w-full rounded-xl bg-slate-800" />
      </div>
    );
  }
  if (!match) return null;

  const winner = match.teams.find((t) => t.won);
  const loser = match.teams.find((t) => !t.won);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-8">
      <Button variant="ghost" onClick={backToProfile} className="-ml-2 text-slate-400 hover:text-white">
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver al perfil
      </Button>

      {/* Cabecera del mapa */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 to-[#FF4655]/15 p-6 text-center">
        <h2 className="text-2xl font-black text-white sm:text-3xl">{match.mapName}</h2>
        <div className="mt-1 text-xs text-slate-400">
          {match.modeLabel} · {Math.round(match.durationMs / 60000)} min ·{' '}
          {formatDistanceToNow(new Date(match.playedAt), { addSuffix: true, locale: es })}
          {match.demo && ' · datos demo'}
        </div>
        <div className="mt-4 flex items-center justify-center gap-4">
          <ScoreTeam team={winner} align="right" />
          <span className="text-slate-600">vs</span>
          <ScoreTeam team={loser} align="left" />
        </div>
      </div>

      {match.teams.map((team) => (
        <Scoreboard
          key={team.teamId}
          team={team}
          highlightPuuid={highlightPuuid}
        />
      ))}
    </div>
  );
}

function ScoreTeam({
  team,
  align,
}: {
  team?: { won: boolean; roundsWon: number; roundsLost: number; teamId: string };
  align: 'left' | 'right';
}) {
  if (!team) return <div className="h-10 w-20" />;
  return (
    <div className={`flex flex-col ${align === 'right' ? 'items-end' : 'items-start'}`}>
      <div className={`text-3xl font-black ${team.won ? 'text-emerald-400' : 'text-rose-400'}`}>
        {team.roundsWon}
      </div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
        Equipo {team.teamId === 'Red' ? 'Rojo' : 'Azul'}
      </div>
    </div>
  );
}

function Scoreboard({
  team,
  highlightPuuid,
}: {
  team: MatchDetailResponse['teams'][number];
  highlightPuuid?: string;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-3 w-3 rounded-sm ${team.won ? 'bg-emerald-500' : 'bg-rose-500'}`} aria-hidden />
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
          Equipo {team.teamId === 'Red' ? 'Rojo' : 'Azul'}
          <span className={`ml-2 ${team.won ? 'text-emerald-400' : 'text-rose-400'}`}>
            {team.won ? 'Victoria' : 'Derrota'} {team.roundsWon}-{team.roundsLost}
          </span>
        </h3>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900 text-left text-[11px] uppercase tracking-wider text-slate-500">
              <th className="px-3 py-2 font-semibold">Jugador</th>
              <th className="px-2 py-2 text-center font-semibold">K/D/A</th>
              <th className="px-2 py-2 text-center font-semibold">K/D</th>
              <th className="px-2 py-2 text-center font-semibold">ADR</th>
              <th className="px-2 py-2 text-center font-semibold">ACS</th>
              <th className="px-3 py-2 text-center font-semibold">HS%</th>
            </tr>
          </thead>
          <tbody>
            {team.players.map((p) => (
              <PlayerRow key={p.puuid} player={p} highlight={p.puuid === highlightPuuid} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PlayerRow({ player: p, highlight }: { player: MatchPlayerRow; highlight: boolean }) {
  const kd = p.deaths ? Math.round((p.kills / p.deaths) * 100) / 100 : p.kills;
  return (
    <tr className={`border-t border-slate-800 ${highlight ? 'bg-[#FF4655]/10' : 'bg-slate-900/40'}`}>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <AgentAvatar name={p.agentName} uuid={p.agentUuid} size={32} rounded="rounded-md" />
          <div className="min-w-0">
            <div className={`max-w-[160px] truncate font-semibold ${highlight ? 'text-[#FF4655]' : 'text-white'}`}>
              {p.gameName}
              <span className="font-normal text-slate-500">#{p.tagLine}</span>
            </div>
            <div className="text-[11px] text-slate-500">{p.agentName}</div>
          </div>
        </div>
      </td>
      <td className="px-2 py-2.5 text-center font-bold text-white">{p.kills}/{p.deaths}/{p.assists}</td>
      <td className={`px-2 py-2.5 text-center font-semibold ${kd >= 1 ? 'text-emerald-400' : 'text-slate-400'}`}>
        {kd.toFixed(2)}
      </td>
      <td className="px-2 py-2.5 text-center text-slate-300">{fmt(p.adr)}</td>
      <td className="px-2 py-2.5 text-center font-semibold text-slate-200">{fmt(p.acs)}</td>
      <td className="px-3 py-2.5 text-center text-slate-300">{p.hsPct}%</td>
    </tr>
  );
}
