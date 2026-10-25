// POST  /api/tournaments/[tournamentId]/registrations — inscribir equipo (admin)
// PATCH /api/tournaments/[tournamentId]/registrations — aprobar/rechazar (admin)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
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
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, name: true, status: true, maxTeams: true, registrationDeadline: true },
  });
  if (!tournament) {
    return NextResponse.json({ error: 'Torneo no encontrado.' }, { status: 404 });
  }
  if (tournament.status !== 'registration') {
    return NextResponse.json(
      { error: `El torneo no acepta inscripciones en estado "${tournament.status}" (requiere "registration").` },
      { status: 409 }
    );
  }
  if (tournament.registrationDeadline && new Date() > tournament.registrationDeadline) {
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

  const team = await db.team.findUnique({ where: { id: parsed.data.teamId }, select: { id: true, name: true } });
  if (!team) {
    return NextResponse.json({ error: 'Equipo no encontrado.' }, { status: 404 });
  }

  // Límite de plazas: cuenta + 1 no puede superar maxTeams
  const current = await db.tournamentRegistration.count({ where: { tournamentId: tournament.id } });
  if (current >= tournament.maxTeams) {
    return NextResponse.json(
      { error: `El torneo está completo (${tournament.maxTeams} equipos).` },
      { status: 409 }
    );
  }

  try {
    const registration = await db.tournamentRegistration.create({
      data: {
        tournamentId: tournament.id,
        teamId: team.id,
        notes: parsed.data.notes,
      },
      include: { team: { select: { id: true, name: true, tag: true } } },
    });
    await writeAudit({
      actor: 'admin-token',
      action: 'registration.create',
      entity: 'TournamentRegistration',
      entityId: registration.id,
      detail: { tournament: tournament.name, team: team.name },
    });
    return NextResponse.json({ registration }, { status: 201 });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'P2002') {
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

  const registration = await db.tournamentRegistration.findUnique({
    where: { id: parsed.data.registrationId },
  });
  if (!registration || registration.tournamentId !== tournamentId) {
    return NextResponse.json({ error: 'Inscripción no encontrada en ese torneo.' }, { status: 404 });
  }

  const newStatus = parsed.data.action === 'approve' ? 'approved' : 'rejected';
  const updated = await db.tournamentRegistration.update({
    where: { id: registration.id },
    data: { status: newStatus },
  });
  await writeAudit({
    actor: 'admin-token',
    action: `registration.${parsed.data.action}`,
    entity: 'TournamentRegistration',
    entityId: registration.id,
    detail: { previousStatus: registration.status, newStatus },
  });
  return NextResponse.json({ registration: updated });
}
