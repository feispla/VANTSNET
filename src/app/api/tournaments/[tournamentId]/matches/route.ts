// POST  /api/tournaments/[tournamentId]/matches — programar partida (admin)
// PATCH /api/tournaments/[tournamentId]/matches — reportar resultado (admin)
import { NextRequest, NextResponse } from 'next/server';
import { db, toIsoTimestamp } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { writeAudit } from '@/lib/audit';
import {
  firstIssueMessage,
  tournamentMatchCreateInput,
  tournamentMatchUpdateInput,
} from '@/lib/validators';
import { EVENTS, publishBusEvent } from '@/lib/bus/publish';

export const dynamic = 'force-dynamic';

// Resumen público de un equipo (igual que el select { id, name, tag } de v6)
function teamSummary(t: { id: string; name: string; tag: string | null } | null | undefined) {
  return t ? { id: t.id, name: t.name, tag: t.tag } : null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { tournamentId } = await params;
  const tournament = await db.orm.public.Tournament
    .whereUnique({ id: tournamentId })
    .select('id', 'name')
    .first();
  if (!tournament) {
    return NextResponse.json({ error: 'Torneo no encontrado.' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido.' }, { status: 400 });
  }
  const parsed = tournamentMatchCreateInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });
  }
  const data = parsed.data;

  // Los equipos, si se indican, deben existir
  const sides = ['homeTeamId', 'awayTeamId'] as const;
  for (const side of sides) {
    const teamId = data[side];
    if (teamId) {
      const exists = await db.orm.public.Team.whereUnique({ id: teamId }).select('id').first();
      if (!exists) {
        return NextResponse.json({ error: 'Uno de los equipos no existe.' }, { status: 404 });
      }
    }
  }

  const match = await db.orm.public.TournamentMatch.create({
    tournamentId: tournament.id,
    round: data.round,
    slot: data.slot ?? null,
    homeTeamId: data.homeTeamId ?? null,
    awayTeamId: data.awayTeamId ?? null,
    playedAt: data.playedAt ?? null,
  });

  // Se resuelven los equipos por separado: la v8 no combina create con include
  const teamIds = [match.homeTeamId, match.awayTeamId].filter((x): x is string => Boolean(x));
  const teams = teamIds.length
    ? await db.orm.public.Team.where((t) => t.id.in(teamIds)).all()
    : [];
  const homeTeam = teams.find((t) => t.id === match.homeTeamId) ?? null;
  const awayTeam = teams.find((t) => t.id === match.awayTeamId) ?? null;

  await writeAudit({
    actor: 'admin-token',
    action: 'match.schedule',
    entity: 'TournamentMatch',
    entityId: match.id,
    detail: { tournament: tournament.name, round: match.round, slot: match.slot },
  });
  // VANTS-BUS: si la partida se programó con fecha, el ecosistema se entera
  // (flask-agents y VANTS HUB consumen match.scheduled).
  if (match.playedAt) {
    const torneoProgramado = await db.orm.public.Tournament
      .whereUnique({ id: tournament.id })
      .select('game')
      .first();
    void publishBusEvent(EVENTS.MATCH_SCHEDULED, {
      matchId: match.id,
      game: torneoProgramado?.game ?? 'valorant',
      startsAt: match.playedAt,
    });
  }
  return NextResponse.json(
    {
      match: {
        id: match.id,
        tournamentId: match.tournamentId,
        round: match.round,
        slot: match.slot,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        status: match.status,
        playedAt: toIsoTimestamp(match.playedAt),
        homeTeam: teamSummary(homeTeam),
        awayTeam: teamSummary(awayTeam),
      },
    },
    { status: 201 }
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { tournamentId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido.' }, { status: 400 });
  }
  const parsed = tournamentMatchUpdateInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });
  }

  const match = await db.orm.public.TournamentMatch
    .whereUnique({ id: parsed.data.matchId })
    .first();
  if (!match || match.tournamentId !== tournamentId) {
    return NextResponse.json({ error: 'Partida no encontrada en ese torneo.' }, { status: 404 });
  }
  if (match.status === 'completed' || match.status === 'forfeit') {
    return NextResponse.json(
      { error: 'La partida ya está cerrada; no se puede modificar. Crea una nueva si hay que corregir el resultado.' },
      { status: 409 }
    );
  }

  const patch: {
    homeScore?: number;
    awayScore?: number;
    status?: string;
    playedAt?: string | null;
  } = {
    homeScore: parsed.data.homeScore,
    awayScore: parsed.data.awayScore,
    status: parsed.data.status,
  };
  if (parsed.data.status === 'completed') {
    patch.playedAt = new Date().toISOString();
  }

  // Transacción: el cambio de estado y el marcador se aplican atómicamente
  const updated = await db.transaction(async (tx) => {
    return tx.orm.public.TournamentMatch.where({ id: match.id }).update(patch);
  });
  if (!updated) {
    return NextResponse.json({ error: 'Partida no encontrada en ese torneo.' }, { status: 404 });
  }

  const teamIds = [updated.homeTeamId, updated.awayTeamId].filter((x): x is string => Boolean(x));
  const teams = teamIds.length
    ? await db.orm.public.Team.where((t) => t.id.in(teamIds)).all()
    : [];

  await writeAudit({
    actor: 'admin-token',
    action: 'match.report',
    entity: 'TournamentMatch',
    entityId: match.id,
    detail: { previousStatus: match.status, ...parsed.data },
  });
  // VANTS-BUS: resultado cerrado (completed o forfeit). El contrato pide
  // los NOMBRES de los equipos (a y b) y el marcador (sa y sb); ya están
  // resueltos arriba, con reserva legible si faltara alguno.
  if (updated.status === 'completed' || updated.status === 'forfeit') {
    const torneoJugado = await db.orm.public.Tournament
      .whereUnique({ id: tournamentId })
      .select('game')
      .first();
    void publishBusEvent(EVENTS.MATCH_FINISHED, {
      matchId: updated.id,
      game: torneoJugado?.game ?? 'valorant',
      a: teams.find((t) => t.id === updated.homeTeamId)?.name ?? updated.homeTeamId ?? 'Equipo local',
      b: teams.find((t) => t.id === updated.awayTeamId)?.name ?? updated.awayTeamId ?? 'Equipo visitante',
      sa: updated.homeScore,
      sb: updated.awayScore,
      finishedAt: toIsoTimestamp(updated.playedAt) ?? new Date().toISOString(),
    });
  }
  return NextResponse.json({
    match: {
      id: updated.id,
      tournamentId: updated.tournamentId,
      round: updated.round,
      slot: updated.slot,
      homeTeamId: updated.homeTeamId,
      awayTeamId: updated.awayTeamId,
      homeScore: updated.homeScore,
      awayScore: updated.awayScore,
      status: updated.status,
      playedAt: toIsoTimestamp(updated.playedAt),
      homeTeam: teamSummary(teams.find((t) => t.id === updated.homeTeamId) ?? null),
      awayTeam: teamSummary(teams.find((t) => t.id === updated.awayTeamId) ?? null),
    },
  });
}
