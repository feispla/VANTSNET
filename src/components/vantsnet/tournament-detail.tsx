'use client';

// Diálogo de detalle de torneo: inscripciones, partidas y acciones de administración.
// Todas las acciones llaman a la API real; los errores del servidor se muestran tal cual.
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Loader2, RefreshCw, Trophy } from 'lucide-react';

export interface TournamentDetail {
  tournament: {
    id: string; slug: string; name: string; game: string; format: string; status: string;
    maxTeams: number; description: string | null; rules: string | null;
    startsAt: string | null; registrationDeadline: string | null;
  };
  registrations: {
    id: string; status: string; notes: string | null; createdAt: string;
    team: { id: string; name: string; tag: string | null; members: { nickname: string; role: string }[] };
  }[];
  matches: {
    id: string; round: number; slot: string | null; status: string;
    homeScore: number; awayScore: number; playedAt: string | null;
    homeTeam: { id: string; name: string; tag: string | null } | null;
    awayTeam: { id: string; name: string; tag: string | null } | null;
  }[];
}

interface TeamLite { id: string; name: string; }

const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador', registration: 'Inscripción', running: 'En juego',
  completed: 'Completado', cancelled: 'Cancelado',
};

const REG_LABEL: Record<string, string> = {
  pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada',
};

const FORMAT_LABEL: Record<string, string> = {
  single_elimination: 'Eliminación simple', double_elimination: 'Eliminación doble', round_robin: 'Liga',
};

function statusBadge(status: string) {
  const style =
    status === 'running' ? 'border-amber-500/50 bg-amber-500/10 text-amber-300' :
    status === 'registration' ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' :
    status === 'completed' ? 'border-sky-500/50 bg-sky-500/10 text-sky-300' :
    status === 'cancelled' ? 'border-rose-500/50 bg-rose-500/10 text-rose-300' :
    'border-slate-600 bg-slate-800 text-slate-300';
  return <Badge variant="outline" className={style}>{STATUS_LABEL[status] ?? status}</Badge>;
}

export function TournamentDetailDialog({
  tournamentId,
  adminToken,
  open,
  onOpenChange,
}: {
  tournamentId: string | null;
  adminToken: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [data, setData] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [teams, setTeams] = useState<TeamLite[]>([]);
  const [regTeamId, setRegTeamId] = useState('');
  const [slot, setSlot] = useState('');
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({});

  const load = useCallback(async () => {
    if (!tournamentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Error al cargar el torneo.');
      setData(body as TournamentDetail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el torneo.');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    if (open) {
      load();
      setTeams([]);
      fetch('/api/teams')
        .then((r) => r.json())
        .then((b) => setTeams(b.teams ?? []))
        .catch(() => undefined);
    }
  }, [open, load]);

  const adminCall = async (
    path: string,
    method: string,
    body: unknown,
    okMsg: string
  ) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { 'X-Admin-Token': adminToken } : {}),
        },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Error HTTP ${res.status}`);
      await load();
      return okMsg;
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="max-h-[85vh] max-w-2xl overflow-y-auto border-slate-700 bg-[#0F172A] text-slate-100"
      >
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-xl font-black text-white">
              {data?.tournament.name ?? 'Cargando torneo…'}
            </DialogTitle>
            {data && statusBadge(data.tournament.status)}
          </div>
          {data && (
            <DialogDescription className="text-slate-400">
              {data.tournament.game} · {FORMAT_LABEL[data.tournament.format] ?? data.tournament.format} ·{' '}
              {data.registrations.length}/{data.tournament.maxTeams} equipos
            </DialogDescription>
          )}
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
            <Loader2 className="h-6 w-6 animate-spin text-[#FF4655]" />
          </div>
        )}
        {!loading && error && !data && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertTriangle className="h-8 w-8 text-rose-400" />
            <p className="text-sm text-slate-300">{error}</p>
            <Button variant="outline" size="sm" onClick={load} className="border-slate-600 text-slate-200">
              <RefreshCw className="mr-2 h-3.5 w-3.5" /> Reintentar
            </Button>
          </div>
        )}
        {!loading && data && (
          <>
            {data.tournament.description && (
              <p className="text-sm leading-relaxed text-slate-300">{data.tournament.description}</p>
            )}

            {error && data && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-800 bg-rose-950/40 p-3 text-sm text-rose-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            {/* Acciones de administración */}
            {adminToken && (
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Administración (token activo)
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-40">
                    <Label htmlFor="t-status" className="text-xs text-slate-400">Estado</Label>
                    <Select
                      value={data.tournament.status}
                      onValueChange={async (v) => {
                        try { await adminCall(`/api/tournaments/${data.tournament.id}`, 'PATCH', { status: v }, 'ok'); }
                        catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
                      }}
                      disabled={busy}
                    >
                      <SelectTrigger id="t-status" className="mt-1 h-9 border-slate-700 bg-slate-900 text-sm text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-slate-700 bg-slate-900 text-white">
                        {Object.entries(STATUS_LABEL).map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-44 flex-1">
                    <Label htmlFor="t-regteam" className="text-xs text-slate-400">Inscribir equipo</Label>
                    <div className="mt-1 flex gap-2">
                      <Select value={regTeamId} onValueChange={setRegTeamId}>
                        <SelectTrigger id="t-regteam" className="h-9 border-slate-700 bg-slate-900 text-sm text-white">
                          <SelectValue placeholder="Elegir equipo…" />
                        </SelectTrigger>
                        <SelectContent className="border-slate-700 bg-slate-900 text-white">
                          {teams.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm" disabled={!regTeamId || busy}
                        className="h-9 bg-[#FF4655] font-bold text-white hover:bg-[#e63a49]"
                        onClick={async () => {
                          try {
                            await adminCall(`/api/tournaments/${data.tournament.id}/registrations`, 'POST', { teamId: regTeamId }, 'ok');
                            setRegTeamId('');
                          } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
                        }}
                      >
                        Inscribir
                      </Button>
                    </div>
                  </div>
                  <div className="min-w-36">
                    <Label htmlFor="t-slot" className="text-xs text-slate-400">Nueva partida (slot)</Label>
                    <div className="mt-1 flex gap-2">
                      <Input
                        id="t-slot" value={slot} onChange={(e) => setSlot(e.target.value)}
                        placeholder="F, SF1…" className="h-9 border-slate-700 bg-slate-900 text-sm text-white"
                      />
                      <Button
                        size="sm" variant="outline" disabled={busy}
                        className="h-9 border-slate-600 text-slate-200"
                        onClick={async () => {
                          try {
                            await adminCall(`/api/tournaments/${data.tournament.id}/matches`, 'POST',
                              { round: 1, slot: slot || undefined }, 'ok');
                            setSlot('');
                          } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
                        }}
                      >
                        Crear
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Inscripciones */}
            <section aria-labelledby="reg-h" className="mt-2">
              <h3 id="reg-h" className="mb-2 text-sm font-bold text-white">Inscripciones</h3>
              {data.registrations.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-700 p-4 text-center text-sm text-slate-500">
                  Aún no hay equipos inscritos.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.registrations.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                      <div>
                        <p className="text-sm font-bold text-white">
                          {r.team.tag ? <span className="text-slate-400">[{r.team.tag}] </span> : null}
                          {r.team.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {r.team.members.length > 0
                            ? r.team.members.map((m) => m.nickname).join(', ')
                            : 'Sin plantilla'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={r.status === 'approved'
                            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                            : r.status === 'rejected'
                              ? 'border-rose-500/50 bg-rose-500/10 text-rose-300'
                              : 'border-amber-500/50 bg-amber-500/10 text-amber-300'}
                        >
                          {REG_LABEL[r.status] ?? r.status}
                        </Badge>
                        {adminToken && r.status === 'pending' && (
                          <>
                            <Button size="sm" variant="outline" disabled={busy}
                              className="h-7 border-emerald-600/60 px-2 text-xs text-emerald-300"
                              onClick={() => adminCall(`/api/tournaments/${data.tournament.id}/registrations`, 'PATCH',
                                { registrationId: r.id, action: 'approve' }, 'ok').catch((e) => setError(e instanceof Error ? e.message : 'Error'))}>
                              Aprobar
                            </Button>
                            <Button size="sm" variant="outline" disabled={busy}
                              className="h-7 border-rose-600/60 px-2 text-xs text-rose-300"
                              onClick={() => adminCall(`/api/tournaments/${data.tournament.id}/registrations`, 'PATCH',
                                { registrationId: r.id, action: 'reject' }, 'ok').catch((e) => setError(e instanceof Error ? e.message : 'Error'))}>
                              Rechazar
                            </Button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Partidas */}
            <section aria-labelledby="match-h" className="mt-4">
              <h3 id="match-h" className="mb-2 text-sm font-bold text-white">Partidas</h3>
              {data.matches.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-700 p-4 text-center text-sm text-slate-500">
                  Todavía no hay partidas programadas.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.matches.map((m) => {
                    const sc = scores[m.id] ?? { home: String(m.homeScore), away: String(m.awayScore) };
                    return (
                      <li key={m.id} className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm text-white">
                            <Trophy className="mr-1.5 inline h-3.5 w-3.5 text-[#FF4655]" />
                            {m.slot ?? `Ronda ${m.round}`}
                            <span className="ml-2 text-slate-400">
                              {m.homeTeam?.name ?? 'TBD'} <span className="text-slate-500">vs</span> {m.awayTeam?.name ?? 'TBD'}
                            </span>
                          </p>
                          <Badge variant="outline"
                            className={m.status === 'completed'
                              ? 'border-sky-500/50 bg-sky-500/10 text-sky-300'
                              : 'border-slate-600 bg-slate-800 text-slate-300'}>
                            {m.status === 'completed' ? `${m.homeScore}–${m.awayScore}` : m.status}
                          </Badge>
                        </div>
                        {adminToken && m.status !== 'completed' && m.status !== 'forfeit' && (
                          <div className="mt-2 flex items-center gap-2">
                            <Input
                              aria-label={`Puntos equipo local, partida ${m.id}`}
                              className="h-8 w-16 border-slate-700 bg-slate-900 text-center text-sm text-white"
                              value={sc.home}
                              onChange={(e) => setScores({ ...scores, [m.id]: { ...sc, home: e.target.value } })}
                            />
                            <span className="text-slate-500">–</span>
                            <Input
                              aria-label={`Puntos equipo visitante, partida ${m.id}`}
                              className="h-8 w-16 border-slate-700 bg-slate-900 text-center text-sm text-white"
                              value={sc.away}
                              onChange={(e) => setScores({ ...scores, [m.id]: { ...sc, away: e.target.value } })}
                            />
                            <Button size="sm" disabled={busy}
                              className="h-8 bg-[#FF4655] text-xs font-bold text-white hover:bg-[#e63a49]"
                              onClick={async () => {
                                try {
                                  await adminCall(`/api/tournaments/${data.tournament.id}/matches`, 'PATCH', {
                                    matchId: m.id,
                                    homeScore: Number(sc.home),
                                    awayScore: Number(sc.away),
                                    status: 'completed',
                                  }, 'ok');
                                } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
                              }}>
                              Completar
                            </Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
