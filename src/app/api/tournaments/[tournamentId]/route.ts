// GET   /api/tournaments/[tournamentId] — detalle público (inscripciones + partidas)
// PATCH /api/tournaments/[tournamentId] — actualizar torneo (admin)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { writeAudit } from '@/lib/audit';
import { firstIssueMessage, tournamentUpdateInput } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const { tournamentId } = await params;
  const t = await db.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      registrations: {
        include: { team: { include: { members: true } } },
        orderBy: { createdAt: 'asc' },
      },
      matches: {
        include: {
          homeTeam: { select: { id: true, name: true, tag: true } },
          awayTeam: { select: { id: true, name: true, tag: true } },
        },
        orderBy: [{ round: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });
  if (!t) {
    return NextResponse.json({ error: 'Torneo no encontrado.' }, { status: 404 });
  }
  return NextResponse.json({
    tournament: {
      id: t.id,
      slug: t.slug,
      name: t.name,
      game: t.game,
      format: t.format,
      status: t.status,
      maxTeams: t.maxTeams,
      description: t.description,
      rules: t.rules,
      startsAt: t.startsAt,
      registrationDeadline: t.registrationDeadline,
      createdAt: t.createdAt,
    },
    registrations: t.registrations.map((r) => ({
      id: r.id,
      status: r.status,
      notes: r.notes,
      createdAt: r.createdAt,
      team: {
        id: r.team.id,
        name: r.team.name,
        tag: r.team.tag,
        game: r.team.game,
        members: r.team.members.map((m) => ({ nickname: m.nickname, role: m.role })),
      },
    })),
    matches: t.matches.map((m) => ({
      id: m.id,
      round: m.round,
      slot: m.slot,
      status: m.status,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      playedAt: m.playedAt,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
    })),
  });
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
  const parsed = tournamentUpdateInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });
  }

  const t = await db.tournament.findUnique({ where: { id: tournamentId }, select: { id: true } });
  if (!t) {
    return NextResponse.json({ error: 'Torneo no encontrado.' }, { status: 404 });
  }

  const updated = await db.tournament.update({ where: { id: t.id }, data: parsed.data });
  await writeAudit({
    actor: 'admin-token',
    action: 'tournament.update',
    entity: 'Tournament',
    entityId: t.id,
    detail: parsed.data,
  });
  return NextResponse.json({ tournament: updated });
}
