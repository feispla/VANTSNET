// GET  /api/teams — lista pública de equipos
// POST /api/teams — crear equipo (admin; header X-Admin-Token)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { writeAudit } from '@/lib/audit';
import { firstIssueMessage, teamCreateInput } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const game = req.nextUrl.searchParams.get('game');
  const teams = await db.team.findMany({
    where: game ? { game } : undefined,
    include: { members: true, _count: { select: { registrations: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return NextResponse.json({
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      tag: t.tag,
      game: t.game,
      region: t.region,
      description: t.description,
      members: t.members.map((m) => ({ id: m.id, nickname: m.nickname, role: m.role })),
      registrations: t._count.registrations,
      createdAt: t.createdAt,
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
    const team = await db.team.create({
      data: {
        name: data.name,
        tag: data.tag,
        game: data.game,
        region: data.region,
        description: data.description,
        members: data.members
          ? { create: data.members.map((m) => ({ nickname: m.nickname, role: m.role })) }
          : undefined,
      },
      include: { members: true },
    });
    await writeAudit({
      actor: 'admin-token',
      action: 'team.create',
      entity: 'Team',
      entityId: team.id,
      detail: { name: team.name, game: team.game },
    });
    return NextResponse.json({ team }, { status: 201 });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'P2002') {
      return NextResponse.json(
        { error: `Ya existe un equipo llamado "${data.name}" para ${data.game}.`, code: 'DUPLICATE_TEAM' },
        { status: 409 }
      );
    }
    console.error('team-create', err);
    return NextResponse.json({ error: 'Error interno al crear el equipo.' }, { status: 500 });
  }
}
