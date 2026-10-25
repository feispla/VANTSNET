// GET   /api/tournaments/[tournamentId] — detalle público (inscripciones + partidas)
// PATCH /api/tournaments/[tournamentId] — actualizar torneo (admin)
import { NextRequest, NextResponse } from 'next/server';
import { db, toIsoTimestamp } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { writeAudit } from '@/lib/audit';
import { firstIssueMessage, tournamentUpdateInput } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const { tournamentId } = await params;
  const t = await db.orm.public.Tournament
    .whereUnique({ id: tournamentId })
    .first();
  if (!t) {
    return NextResponse.json({ error: 'Torneo no encontrado.' }, { status: 404 });
  }

  // Consultas secuenciales: la v8 resuelve relaciones de a un nivel por include,
  // y este detalle necesita tres niveles (registrations -> team -> members).
  const registrations = await db.orm.public.TournamentRegistration
    .include('team')
    .where({ tournamentId: t.id })
    .orderBy((r) => r.createdAt.asc())
    .all();
  const teamIds = [...new Set(registrations.map((r) => r.teamId))];
  const members = teamIds.length
    ? await db.orm.public.TeamMember.where((m) => m.teamId.in(teamIds)).all()
    : [];
  const matches = await db.orm.public.TournamentMatch
    .where({ tournamentId: t.id })
    .orderBy((m) => m.round.asc())
    .orderBy((m) => m.createdAt.asc())
    .all();
  const matchTeamIds = [...new Set(
    matches.flatMap((m) => [m.homeTeamId, m.awayTeamId].filter((x): x is string => Boolean(x)))
  )];
  const matchTeams = matchTeamIds.length
    ? await db.orm.public.Team.where((tm) => tm.id.in(matchTeamIds)).all()
    : [];
  const teamById = new Map(matchTeams.map((tm) => [tm.id, tm]));

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
      startsAt: toIsoTimestamp(t.startsAt),
      registrationDeadline: toIsoTimestamp(t.registrationDeadline),
      createdAt: toIsoTimestamp(t.createdAt),
    },
    registrations: registrations.map((r) => ({
      id: r.id,
      status: r.status,
      notes: r.notes,
      createdAt: toIsoTimestamp(r.createdAt),
      team: {
        id: r.team.id,
        name: r.team.name,
        tag: r.team.tag,
        game: r.team.game,
        members: members
          .filter((m) => m.teamId === r.teamId)
          .map((m) => ({ nickname: m.nickname, role: m.role })),
      },
    })),
    matches: matches.map((m) => ({
      id: m.id,
      round: m.round,
      slot: m.slot,
      status: m.status,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      playedAt: toIsoTimestamp(m.playedAt),
      homeTeam: m.homeTeamId ? teamById.get(m.homeTeamId) ?? null : null,
      awayTeam: m.awayTeamId ? teamById.get(m.awayTeamId) ?? null : null,
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

  const t = await db.orm.public.Tournament.whereUnique({ id: tournamentId }).select('id').first();
  if (!t) {
    return NextResponse.json({ error: 'Torneo no encontrado.' }, { status: 404 });
  }

  const updated = await db.orm.public.Tournament.where({ id: t.id }).update(parsed.data);
  await writeAudit({
    actor: 'admin-token',
    action: 'tournament.update',
    entity: 'Tournament',
    entityId: t.id,
    detail: parsed.data,
  });
  return NextResponse.json({ tournament: updated });
}
