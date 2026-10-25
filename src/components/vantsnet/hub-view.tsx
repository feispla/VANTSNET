'use client';

// Vista "Competitivo": torneos, equipos y estado del servicio.
// Datos 100% reales de la API; los estados vacío/carga/error son explícitos.
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Database, KeyRound, Loader2, Plus, RefreshCw, ShieldCheck, Trophy, Users } from 'lucide-react';
import { TournamentDetailDialog } from '@/components/vantsnet/tournament-detail';
import { useVantsnet } from '@/lib/store';

interface TournamentLite {
  id: string; slug: string; name: string; game: string; format: string; status: string;
  maxTeams: number; description: string | null; registeredTeams: number; matches: number;
}
interface TeamLite {
  id: string; name: string; tag: string | null; game: string; region: string | null;
  members: { id: string; nickname: string; role: string }[];
}
interface Health {
  status: string; time: string;
  checks: {
    database: string;
    integrations: { riot: boolean; steam: boolean; discord: boolean; faceit: boolean };
    admin: boolean;
  };
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador', registration: 'Inscripción', running: 'En juego',
  completed: 'Completado', cancelled: 'Cancelado',
};

function statusStyle(status: string) {
  return status === 'running' ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
    : status === 'registration' ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
    : status === 'completed' ? 'border-sky-500/50 bg-sky-500/10 text-sky-300'
    : status === 'cancelled' ? 'border-rose-500/50 bg-rose-500/10 text-rose-300'
    : 'border-slate-600 bg-slate-800 text-slate-300';
}

export function HubView() {
  const goHome = useVantsnet((s) => s.goHome);
  const [tournaments, setTournaments] = useState<TournamentLite[] | null>(null);
  const [teams, setTeams] = useState<TeamLite[] | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [creating, setCreating] = useState<'tournament' | 'team' | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    tourName: '', tourGame: 'valorant', tourFormat: 'single_elimination', tourMax: '8', tourDesc: '',
    teamName: '', teamTag: '', teamGame: 'valorant', teamMembers: '',
  });

  const load = useCallback(async () => {
    setError(null);
    try {
      const [t, e, h] = await Promise.all([
        fetch('/api/tournaments').then((r) => r.json()),
        fetch('/api/teams').then((r) => r.json()),
        fetch('/api/health').then((r) => r.json()),
      ]);
      setTournaments(t.tournaments ?? []);
      setTeams(e.teams ?? []);
      setHealth(h as Health);
    } catch {
      setError('No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.');
    }
  }, []);

  useEffect(() => {
    load();
    setAdminToken(window.sessionStorage.getItem('vantsnet-admin-token') ?? '');
  }, [load]);

  const saveToken = (value: string) => {
    setAdminToken(value);
    if (value) window.sessionStorage.setItem('vantsnet-admin-token', value);
    else window.sessionStorage.removeItem('vantsnet-admin-token');
  };

  const createTournament = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
        body: JSON.stringify({
          name: form.tourName.trim(),
          game: form.tourGame,
          format: form.tourFormat,
          maxTeams: Number(form.tourMax) || 8,
          description: form.tourDesc.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Error HTTP ${res.status}`);
      setCreating(null);
      setForm({ ...form, tourName: '', tourDesc: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el torneo.');
    } finally {
      setBusy(false);
    }
  };

  const createTeam = async () => {
    setBusy(true);
    setError(null);
    try {
      const members = form.teamMembers
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => {
          const [nickname, role] = l.split(',').map((p) => p?.trim());
          return { nickname, role: role || 'player' };
        });
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
        body: JSON.stringify({
          name: form.teamName.trim(),
          tag: form.teamTag.trim() || undefined,
          game: form.teamGame,
          members: members.length > 0 ? members : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Error HTTP ${res.status}`);
      setCreating(null);
      setForm({ ...form, teamName: '', teamTag: '', teamMembers: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el equipo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col px-4 py-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Competitivo <span className="text-[#FF4655]">VANTSNET</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Torneos, equipos y estado de la red. Datos reales de la base de datos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              className="border-slate-700 text-slate-300"
              onClick={() => setShowAdmin((v) => !v)}
              aria-expanded={showAdmin}
            >
              <KeyRound className="mr-2 h-3.5 w-3.5" />
              {adminToken ? 'Admin activo' : 'Soy admin'}
            </Button>
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300" onClick={goHome}>
              ← Estadísticas
            </Button>
          </div>
        </div>

        {showAdmin && (
          <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <Label htmlFor="admin-token" className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Token de administración
            </Label>
            <div className="mt-2 flex gap-2">
              <Input
                id="admin-token" type="password" value={adminToken}
                onChange={(e) => saveToken(e.target.value)}
                placeholder="Valor de ADMIN_TOKEN (se guarda solo en esta pestaña)"
                className="h-10 border-slate-700 bg-slate-900 text-sm text-white"
                autoComplete="off"
              />
              <Button variant="outline" size="sm" className="border-slate-600 text-slate-300"
                onClick={() => saveToken('')}>
                Borrar
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Se guarda en sessionStorage de esta pestaña; nunca se envía a ningún servicio distinto de esta API.
            </p>
          </div>
        )}

        {error && (
          <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-rose-800 bg-rose-950/40 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
            <p className="flex-1 text-sm text-rose-200">{error}</p>
            <Button variant="ghost" size="sm" className="text-xs text-slate-400" onClick={() => setError(null)}>CERRAR</Button>
          </div>
        )}

        <Tabs defaultValue="tournaments">
          <TabsList className="bg-slate-900">
            <TabsTrigger value="tournaments" className="data-[state=active]:text-[#FF4655]">
              <Trophy className="mr-1.5 h-3.5 w-3.5" /> Torneos
            </TabsTrigger>
            <TabsTrigger value="teams" className="data-[state=active]:text-[#FF4655]">
              <Users className="mr-1.5 h-3.5 w-3.5" /> Equipos
            </TabsTrigger>
            <TabsTrigger value="status" className="data-[state=active]:text-[#FF4655]">
              <Database className="mr-1.5 h-3.5 w-3.5" /> Estado
            </TabsTrigger>
          </TabsList>

          {/* TORNEOS */}
          <TabsContent value="tournaments" className="mt-4">
            <div className="mb-3 flex justify-end">
              <Button size="sm" className="bg-[#FF4655] font-bold text-white hover:bg-[#e63a49]"
                onClick={() => setCreating('tournament')}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Nuevo torneo
              </Button>
            </div>
            {tournaments === null ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full bg-slate-800" />
                <Skeleton className="h-20 w-full bg-slate-800" />
              </div>
            ) : tournaments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
                <Trophy className="mx-auto h-10 w-10 text-slate-600" />
                <p className="mt-3 text-sm font-semibold text-slate-300">Todavía no hay torneos</p>
                <p className="mt-1 text-xs text-slate-500">
                  Crea el primero con «Nuevo torneo» (necesitas el token de administración).
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {tournaments.map((t) => (
                  <li key={t.id}>
                    <button
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-left transition-colors hover:border-[#FF4655]/50 hover:bg-slate-900"
                      onClick={() => { setDetailId(t.id); setDetailOpen(true); }}
                      aria-label={`Ver detalle de ${t.name}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold text-white">{t.name}</p>
                        <Badge variant="outline" className={statusStyle(t.status)}>
                          {STATUS_LABEL[t.status] ?? t.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {t.game} · {t.registeredTeams}/{t.maxTeams} equipos · {t.matches} partidas
                        {t.description ? ` — ${t.description}` : ''}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          {/* EQUIPOS */}
          <TabsContent value="teams" className="mt-4">
            <div className="mb-3 flex justify-end">
              <Button size="sm" className="bg-[#FF4655] font-bold text-white hover:bg-[#e63a49]"
                onClick={() => setCreating('team')}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Nuevo equipo
              </Button>
            </div>
            {teams === null ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full bg-slate-800" />
                <Skeleton className="h-16 w-full bg-slate-800" />
              </div>
            ) : teams.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
                <Users className="mx-auto h-10 w-10 text-slate-600" />
                <p className="mt-3 text-sm font-semibold text-slate-300">Sin equipos todavía</p>
                <p className="mt-1 text-xs text-slate-500">Crea el primero con «Nuevo equipo».</p>
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {teams.map((t) => (
                  <li key={t.id} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                    <p className="font-bold text-white">
                      {t.tag ? <span className="text-slate-400">[{t.tag}] </span> : null}
                      {t.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {t.game}{t.region ? ` · ${t.region}` : ''} · {t.members.length} jugadores
                    </p>
                    {t.members.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {t.members.map((m) => (
                          <li key={m.id} className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">{m.nickname}</span>
                            <span className="text-slate-500">{m.role}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          {/* ESTADO */}
          <TabsContent value="status" className="mt-4">
            <div className="mb-3 flex justify-end">
              <Button size="sm" variant="outline" className="border-slate-600 text-slate-300" onClick={load}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Actualizar
              </Button>
            </div>
            {!health ? (
              <Skeleton className="h-40 w-full bg-slate-800" />
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={health.status === 'healthy' ? 'h-5 w-5 text-emerald-400' : 'h-5 w-5 text-amber-400'} />
                    <p className="font-bold text-white">
                      Servicio {health.status === 'healthy' ? 'operativo' : 'degradado'}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Verificado a las {new Date(health.time).toLocaleString('es-ES')}</p>
                  <p className="mt-2 text-sm text-slate-300">
                    Base de datos: <span className={health.checks.database === 'ok' ? 'text-emerald-300' : 'text-rose-300'}>
                      {health.checks.database === 'ok' ? 'conectada' : 'sin conexión'}
                    </span>
                  </p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Integraciones</p>
                  <ul className="space-y-2">
                    {[
                      ['Riot Games (Valorant)', health.checks.integrations.riot],
                      ['Steam Web API', health.checks.integrations.steam],
                      ['Discord OAuth', health.checks.integrations.discord],
                      ['FACEIT Data API', health.checks.integrations.faceit],
                    ].map(([name, ok]) => (
                      <li key={String(name)} className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">{name}</span>
                        <Badge variant="outline"
                          className={ok
                            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                            : 'border-slate-600 bg-slate-800 text-slate-400'}>
                          {ok ? 'configurada' : 'no configurada'}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-slate-500">
                    «No configurada» significa que falta la clave en el servidor; la guía de cada integración está en docs/INTEGRATIONS.md.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Detalle de torneo */}
      <TournamentDetailDialog
        tournamentId={detailId}
        adminToken={adminToken}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      {/* Crear torneo */}
      <Dialog open={creating === 'tournament'} onOpenChange={(v) => !v && setCreating(null)}>
        <DialogContent className="border-slate-700 bg-[#0F172A] text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Nuevo torneo</DialogTitle>
            <DialogDescription className="text-slate-400">
              Se creará en estado Borrador; después podrás abrir la inscripción desde su detalle.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="nt-name" className="text-xs text-slate-400">Nombre</Label>
              <Input id="nt-name" value={form.tourName} onChange={(e) => setForm({ ...form, tourName: e.target.value })}
                placeholder="VANTSNET Open #1" className="mt-1 border-slate-700 bg-slate-900 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="nt-game" className="text-xs text-slate-400">Juego</Label>
                <Input id="nt-game" value={form.tourGame} onChange={(e) => setForm({ ...form, tourGame: e.target.value })}
                  className="mt-1 border-slate-700 bg-slate-900 text-white" />
              </div>
              <div>
                <Label htmlFor="nt-max" className="text-xs text-slate-400">Máx. equipos</Label>
                <Input id="nt-max" type="number" min={2} max={128} value={form.tourMax}
                  onChange={(e) => setForm({ ...form, tourMax: e.target.value })}
                  className="mt-1 border-slate-700 bg-slate-900 text-white" />
              </div>
            </div>
            <div>
              <Label htmlFor="nt-format" className="text-xs text-slate-400">Formato</Label>
              <Select value={form.tourFormat} onValueChange={(v) => setForm({ ...form, tourFormat: v })}>
                <SelectTrigger id="nt-format" className="mt-1 border-slate-700 bg-slate-900 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-900 text-white">
                  <SelectItem value="single_elimination">Eliminación simple</SelectItem>
                  <SelectItem value="double_elimination">Eliminación doble</SelectItem>
                  <SelectItem value="round_robin">Liga (todos contra todos)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="nt-desc" className="text-xs text-slate-400">Descripción (opcional)</Label>
              <Input id="nt-desc" value={form.tourDesc} onChange={(e) => setForm({ ...form, tourDesc: e.target.value })}
                className="mt-1 border-slate-700 bg-slate-900 text-white" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="border-slate-600 text-slate-300" onClick={() => setCreating(null)}>
              Cancelar
            </Button>
            <Button disabled={busy || form.tourName.trim().length < 3}
              className="bg-[#FF4655] font-bold text-white hover:bg-[#e63a49]"
              onClick={createTournament}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Crear torneo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Crear equipo */}
      <Dialog open={creating === 'team'} onOpenChange={(v) => !v && setCreating(null)}>
        <DialogContent className="border-slate-700 bg-[#0F172A] text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Nuevo equipo</DialogTitle>
            <DialogDescription className="text-slate-400">
              Añade la plantilla inicial, un apodo por línea (opcional «apodo, rol»).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="nt-team" className="text-xs text-slate-400">Nombre</Label>
                <Input id="nt-team" value={form.teamName} onChange={(e) => setForm({ ...form, teamName: e.target.value })}
                  placeholder="Vants Academy" className="mt-1 border-slate-700 bg-slate-900 text-white" />
              </div>
              <div>
                <Label htmlFor="nt-tag" className="text-xs text-slate-400">Tag (opcional)</Label>
                <Input id="nt-tag" value={form.teamTag} onChange={(e) => setForm({ ...form, teamTag: e.target.value })}
                  placeholder="VNTS" maxLength={6} className="mt-1 border-slate-700 bg-slate-900 text-white" />
              </div>
            </div>
            <div>
              <Label htmlFor="nt-members" className="text-xs text-slate-400">Plantilla</Label>
              <textarea
                id="nt-members" rows={4} value={form.teamMembers}
                onChange={(e) => setForm({ ...form, teamMembers: e.target.value })}
                placeholder={'feispla, captain\nPlayerTwo, player'}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-white placeholder:text-slate-500"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="border-slate-600 text-slate-300" onClick={() => setCreating(null)}>
              Cancelar
            </Button>
            <Button disabled={busy || form.teamName.trim().length < 2}
              className="bg-[#FF4655] font-bold text-white hover:bg-[#e63a49]"
              onClick={createTeam}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Crear equipo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
