// GET  /api/tournaments — lista pública (filtro opcional ?status=)
// POST /api/tournaments — crear torneo (admin)
import { NextRequest, NextResponse } from 'next/server';
import { db, isUniqueViolation, toIsoTimestamp } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { writeAudit } from '@/lib/audit';
import { EVENTS, publishBusEvent } from '@/lib/bus/vants-bus';
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
  const base = db.orm.public.Tournament
    .include('registrations', (r) => r.count())
    .include('matches', (m) => m.count());
  const rows = await (status ? base.where({ status }) : base)
    .orderBy((t) => t.createdAt.desc())
    .limit(100)
    .all();
  return NextResponse.json({
    tournaments: rows.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      game: t.game,
      format: t.format,
      status: t.status,
      maxTeams: t.maxTeams,
      description: t.description,
      startsAt: toIsoTimestamp(t.startsAt),
      registrationDeadline: toIsoTimestamp(t.registrationDeadline),
      registeredTeams: t.registrations,
      matches: t.matches,
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
  const parsed = tournamentCreateInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });
  }
  const data = parsed.data;

  // Slug único: base derivada del nombre + sufijo incremental si colisiona
  let slug = slugify(data.name);
  const existing = await db.orm.public.Tournament
    .select('slug')
    .where((t) => t.slug.like(`${slug}%`))
    .all();
  if (existing.some((t) => t.slug === slug)) {
    let i = 2;
    while (existing.some((t) => t.slug === `${slug}-${i}`)) i++;
    slug = `${slug}-${i}`;
  }

  try {
    const tournament = await db.orm.public.Tournament.create({
      slug,
      name: data.name,
      game: data.game,
      format: data.format,
      maxTeams: data.maxTeams,
      description: data.description ?? null,
      rules: data.rules ?? null,
      startsAt: data.startsAt ?? null,
      registrationDeadline: data.registrationDeadline ?? null,
    });
    await writeAudit({
      actor: 'admin-token',
      action: 'tournament.create',
      entity: 'Tournament',
      entityId: tournament.id,
      detail: { name: tournament.name, slug: tournament.slug },
    });
    // VANTS-BUS: el torneo quedó creado y acepta inscripciones;
    // flask-agents puede anunciarlo en Discord y VANTS HUB lo notifica.
    // El envío no bloquea la respuesta y queda apagado sin bus.
    publishBusEvent(EVENTS.TOURNAMENT_OPENED, {
      tournamentId: tournament.slug,
      nombre: tournament.name,
      game: tournament.game,
    });
    return NextResponse.json({ tournament }, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: 'El slug del torneo ya existe.', code: 'DUPLICATE_SLUG' }, { status: 409 });
    }
    console.error('tournament-create', err);
    return NextResponse.json({ error: 'Error interno al crear el torneo.' }, { status: 500 });
  }
}
