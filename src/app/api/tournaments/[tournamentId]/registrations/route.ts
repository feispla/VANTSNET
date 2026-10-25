// POST  /api/tournaments/[tournamentId]/registrations — inscribir equipo (admin)
// PATCH /api/tournaments/[tournamentId]/registrations — aprobar/rechazar (admin)
import { NextRequest, NextResponse } from 'next/server';
import { db, isUniqueViolation, toIsoTimestamp } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { writeAudit } from '@/lib/audit';
import {
  firstIssueMessage,
  registrationActionInput,
  registrationCreateInput,
} from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { tournamentId } = await params;
  const tournament = await db.orm.public.Tournament
    .whereUnique({ id: tournamentId })
    .first();
  if (!tournament) {
    return NextResponse.json({ error: 'Torneo no encontrado.' }, { status: 404 });
  }
  if (tournament.status !== 'registration') {
    return NextResponse.json(
      { error: `El torneo no acepta inscripciones en estado "${tournament.status}" (requiere "registration").` },
      { status: 409 }
    );
  }
  if (tournament.registrationDeadline && new Date() > new Date(tournament.registrationDeadline)) {
    return NextResponse.json(
      { error: 'El plazo de inscripción está cerrado.' },
      { status: 409 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido.' }, { status: 400 });
  }
  const parsed = registrationCreateInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });
  }

  const team = await db.orm.public.Team
    .whereUnique({ id: parsed.data.teamId })
    .select('id', 'name')
    .first();
  if (!team) {
    return NextResponse.json({ error: 'Equipo no encontrado.' }, { status: 404 });
  }

  // Límite de plazas: cuenta + 1 no puede superar maxTeams
  const regAgg = await db.orm.public.TournamentRegistration
    .where({ tournamentId: tournament.id })
    .aggregate((agg) => ({ current: agg.count() }));
  if (regAgg.current >= tournament.maxTeams) {
    return NextResponse.json(
      { error: `El torneo está completo (${tournament.maxTeams} equipos).` },
      { status: 409 }
    );
  }

  try {
    const registration = await db.orm.public.TournamentRegistration.create({
      tournamentId: tournament.id,
      teamId: team.id,
      notes: parsed.data.notes ?? null,
    });
    await writeAudit({
      actor: 'admin-token',
      action: 'registration.create',
      entity: 'TournamentRegistration',
      entityId: registration.id,
      detail: { tournament: tournament.name, team: team.name },
    });
    return NextResponse.json(
      {
        registration: {
          id: registration.id,
          tournamentId: registration.tournamentId,
          teamId: registration.teamId,
          status: registration.status,
          notes: registration.notes,
          createdAt: toIsoTimestamp(registration.createdAt),
          team: { id: team.id, name: team.name },
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: 'Ese equipo ya está inscrito en el torneo.', code: 'DUPLICATE_REGISTRATION' },
        { status: 409 }
      );
    }
    console.error('registration-create', err);
    return NextResponse.json({ error: 'Error interno al inscribir el equipo.' }, { status: 500 });
  }
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
  const parsed = registrationActionInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });
  }

  const registration = await db.orm.public.TournamentRegistration
    .whereUnique({ id: parsed.data.registrationId })
    .first();
  if (!registration || registration.tournamentId !== tournamentId) {
    return NextResponse.json({ error: 'Inscripción no encontrada en ese torneo.' }, { status: 404 });
  }

  const newStatus = parsed.data.action === 'approve' ? 'approved' : 'rejected';
  const updated = await db.orm.public.TournamentRegistration
    .where({ id: registration.id })
    .update({ status: newStatus });
  if (!updated) {
    return NextResponse.json({ error: 'Inscripción no encontrada en ese torneo.' }, { status: 404 });
  }
  await writeAudit({
    actor: 'admin-token',
    action: `registration.${parsed.data.action}`,
    entity: 'TournamentRegistration',
    entityId: registration.id,
    detail: { previousStatus: registration.status, newStatus },
  });
  return NextResponse.json({ registration: { ...updated, createdAt: toIsoTimestamp(updated.createdAt) } });
}
