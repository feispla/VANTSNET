// POST /api/teams/[teamId]/members — añadir miembro (admin)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { writeAudit } from '@/lib/audit';
import { firstIssueMessage, teamMemberCreateInput } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { teamId } = await params;
  const team = await db.team.findUnique({ where: { id: teamId }, select: { id: true, name: true } });
  if (!team) {
    return NextResponse.json({ error: 'Equipo no encontrado.' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido.' }, { status: 400 });
  }
  const parsed = teamMemberCreateInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });
  }

  try {
    const member = await db.teamMember.create({
      data: { teamId: team.id, nickname: parsed.data.nickname, role: parsed.data.role },
    });
    await writeAudit({
      actor: 'admin-token',
      action: 'team.member.add',
      entity: 'Team',
      entityId: team.id,
      detail: { nickname: member.nickname, role: member.role },
    });
    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'P2002') {
      return NextResponse.json(
        { error: 'Ese apodo ya está en la plantilla del equipo.', code: 'DUPLICATE_MEMBER' },
        { status: 409 }
      );
    }
    console.error('member-add', err);
    return NextResponse.json({ error: 'Error interno al añadir el miembro.' }, { status: 500 });
  }
}
