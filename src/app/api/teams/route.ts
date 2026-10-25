// GET  /api/teams — lista pública de equipos
// POST /api/teams — crear equipo (admin; header X-Admin-Token)
import { NextRequest, NextResponse } from 'next/server';
import { db, isUniqueViolation, toIsoTimestamp } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { writeAudit } from '@/lib/audit';
import { firstIssueMessage, teamCreateInput } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const game = req.nextUrl.searchParams.get('game');
  const base = db.orm.public.Team.include('members');
  const rows = await (game ? base.where({ game }) : base)
    .orderBy((t) => t.createdAt.desc())
    .limit(100)
    .all();

  // Recuento de inscripciones por equipo (equivalente al _count de v6)
  const registrations = await db.orm.public.TournamentRegistration
    .groupBy('teamId')
    .aggregate((agg) => ({ total: agg.count() }));
  const regByTeam = new Map(registrations.map((r) => [r.teamId, r.total]));

  return NextResponse.json({
    teams: rows.map((t) => ({
      id: t.id,
      name: t.name,
      tag: t.tag,
      game: t.game,
      region: t.region,
      description: t.description,
      members: t.members.map((m) => ({ id: m.id, nickname: m.nickname, role: m.role })),
      registrations: regByTeam.get(t.id) ?? 0,
      createdAt: toIsoTimestamp(t.createdAt),
    })),
  });
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido.' }, { status: 400 });
  }
  const parsed = teamCreateInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });
  }
  const data = parsed.data;

  try {
    // El equipo y sus miembros iniciales se crean en una transacción
    const team = await db.transaction(async (tx) => {
      const created = await tx.orm.public.Team.create({
        name: data.name,
        tag: data.tag ?? null,
        game: data.game,
        region: data.region ?? null,
        description: data.description ?? null,
      });
      if (data.members?.length) {
        await tx.orm.public.TeamMember.createAll(
          data.members.map((m) => ({
            teamId: created.id,
            nickname: m.nickname,
            role: m.role,
          }))
        );
      }
      return created;
    });
    const members = await db.orm.public.TeamMember.where({ teamId: team.id }).all();

    await writeAudit({
      actor: 'admin-token',
      action: 'team.create',
      entity: 'Team',
      entityId: team.id,
      detail: { name: team.name, game: team.game },
    });
    return NextResponse.json(
      {
        team: {
          id: team.id,
          name: team.name,
          tag: team.tag,
          game: team.game,
          region: team.region,
          description: team.description,
          members: members.map((m) => ({ id: m.id, nickname: m.nickname, role: m.role })),
          createdAt: toIsoTimestamp(team.createdAt),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: `Ya existe un equipo llamado "${data.name}" para ${data.game}.`, code: 'DUPLICATE_TEAM' },
        { status: 409 }
      );
    }
    console.error('team-create', err);
    return NextResponse.json({ error: 'Error interno al crear el equipo.' }, { status: 500 });
  }
}
