// POST  /api/tournaments/[tournamentId]/matches — programar partida (admin)
// PATCH /api/tournaments/[tournamentId]/matches — reportar resultado (admin)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { writeAudit } from '@/lib/audit';
import {
  firstIssueMessage,
  tournamentMatchCreateInput,
  tournamentMatchUpdateInput,
} from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { tournamentId } = await params;
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, name: true },
  });
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
  for (const side of ['homeTeamId', 'awayTeamId'] as const) {
    const teamId = data[side];
    if (teamId) {
      const exists = await db.team.findUnique({ where: { id: teamId }, select: { id: true } });
      if (!exists) {
        return NextResponse.json({ error: 'Uno de los equipos no existe.' }, { status: 404 });
      }
    }
  }

  const match = await db.tournamentMatch.create({
    data: {
      tournamentId: tournament.id,
      round: data.round,
      slot: data.slot,
      homeTeamId: data.homeTeamId ?? null,
      awayTeamId: data.awayTeamId ?? null,
      playedAt: data.playedAt,
    },
    include: {
      homeTeam: { select: { id: true, name: true, tag: true } },
      awayTeam: { select: { id: true, name: true, tag: true } },
    },
  });
  await writeAudit({
    actor: 'admin-token',
    action: 'match.schedule',
    entity: 'TournamentMatch',
    entityId: match.id,
    detail: { tournament: tournament.name, round: match.round, slot: match.slot },
  });
  return NextResponse.json({ match }, { status: 201 });
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

  const match = await db.tournamentMatch.findUnique({ where: { id: parsed.data.matchId } });
  if (!match || match.tournamentId !== tournamentId) {
    return NextResponse.json({ error: 'Partida no encontrada en ese torneo.' }, { status: 404 });
  }
  if (match.status === 'completed' || match.status === 'forfeit') {
    return NextResponse.json(
      { error: 'La partida ya está cerrada; no se puede modificar. Crea una nueva si hay que corregir el resultado.' },
      { status: 409 }
    );
  }

  const data: {
    homeScore?: number;
    awayScore?: number;
    status?: string;
    playedAt?: Date;
  } = {
    homeScore: parsed.data.homeScore,
    awayScore: parsed.data.awayScore,
    status: parsed.data.status,
  };
  if (parsed.data.status === 'completed') {
    data.playedAt = new Date();
  }

  // Transacción: el cambio de estado y el marcador se aplican atómicamente
  const updated = await db.$transaction(async (tx) => {
    return tx.tournamentMatch.update({
      where: { id: match.id },
      data,
      include: {
        homeTeam: { select: { id: true, name: true, tag: true } },
        awayTeam: { select: { id: true, name: true, tag: true } },
      },
    });
  });

  await writeAudit({
    actor: 'admin-token',
    action: 'match.report',
    entity: 'TournamentMatch',
    entityId: match.id,
    detail: { previousStatus: match.status, ...parsed.data },
  });
  return NextResponse.json({ match: updated });
}
