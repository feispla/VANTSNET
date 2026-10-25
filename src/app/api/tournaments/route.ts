// GET  /api/tournaments — lista pública (filtro opcional ?status=)
// POST /api/tournaments — crear torneo (admin)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { writeAudit } from '@/lib/audit';
import {
  firstIssueMessage,
  slugify,
  TOURNAMENT_STATUSES,
  tournamentCreateInput,
} from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status');
  if (status && !TOURNAMENT_STATUSES.includes(status as (typeof TOURNAMENT_STATUSES)[number])) {
    return NextResponse.json(
      { error: `Estado inválido. Valores: ${TOURNAMENT_STATUSES.join(', ')}.` },
      { status: 400 }
    );
  }
  const tournaments = await db.tournament.findMany({
    where: status ? { status } : undefined,
    include: { _count: { select: { registrations: true, matches: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return NextResponse.json({
    tournaments: tournaments.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      game: t.game,
      format: t.format,
      status: t.status,
      maxTeams: t.maxTeams,
      description: t.description,
      startsAt: t.startsAt,
      registrationDeadline: t.registrationDeadline,
      registeredTeams: t._count.registrations,
      matches: t._count.matches,
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
  const parsed = tournamentCreateInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });
  }
  const data = parsed.data;

  // Slug único: base derivada del nombre + sufijo incremental si colisiona
  let slug = slugify(data.name);
  const existing = await db.tournament.findMany({
    where: { slug: { startsWith: slug } },
    select: { slug: true },
  });
  if (existing.some((t) => t.slug === slug)) {
    let i = 2;
    while (existing.some((t) => t.slug === `${slug}-${i}`)) i++;
    slug = `${slug}-${i}`;
  }

  try {
    const tournament = await db.tournament.create({
      data: {
        slug,
        name: data.name,
        game: data.game,
        format: data.format,
        maxTeams: data.maxTeams,
        description: data.description,
        rules: data.rules,
        startsAt: data.startsAt,
        registrationDeadline: data.registrationDeadline,
      },
    });
    await writeAudit({
      actor: 'admin-token',
      action: 'tournament.create',
      entity: 'Tournament',
      entityId: tournament.id,
      detail: { name: tournament.name, slug: tournament.slug },
    });
    return NextResponse.json({ tournament }, { status: 201 });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'P2002') {
      return NextResponse.json({ error: 'El slug del torneo ya existe.', code: 'DUPLICATE_SLUG' }, { status: 409 });
    }
    console.error('tournament-create', err);
    return NextResponse.json({ error: 'Error interno al crear el torneo.' }, { status: 500 });
  }
}
