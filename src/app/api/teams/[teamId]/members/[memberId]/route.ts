// DELETE /api/teams/[teamId]/members/[memberId] — eliminar miembro (admin)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string; memberId: string }> }
) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { teamId, memberId } = await params;
  const member = await db.orm.public.TeamMember.whereUnique({ id: memberId }).first();
  if (!member || member.teamId !== teamId) {
    return NextResponse.json({ error: 'Miembro no encontrado en ese equipo.' }, { status: 404 });
  }
  await db.orm.public.TeamMember.whereUnique({ id: member.id }).delete();
  await writeAudit({
    actor: 'admin-token',
    action: 'team.member.remove',
    entity: 'Team',
    entityId: teamId,
    detail: { memberId: member.id, nickname: member.nickname },
  });
  return NextResponse.json({ ok: true });
}
