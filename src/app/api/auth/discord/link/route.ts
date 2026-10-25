// DELETE /api/auth/discord/link — desvincula una identidad Discord (admin).
// Nota: en el prototipo la desconexión exige token de administración porque
// aún no hay sesiones de usuario; con sesiones (NextAuth) pasará a exigir
// propiedad de la cuenta. Documentado en docs/SECURITY.md.
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  let providerId: string | null = null;
  try {
    const body = (await req.json()) as { providerId?: string };
    providerId = body.providerId?.trim() || null;
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido.' }, { status: 400 });
  }
  if (!providerId) {
    return NextResponse.json({ error: 'Falta providerId de Discord.' }, { status: 400 });
  }

  const identity = await db.orm.public.ProviderIdentity
    .whereUnique({ provider: 'discord', providerId })
    .first();
  if (!identity) {
    return NextResponse.json({ error: 'Identidad de Discord no vinculada.' }, { status: 404 });
  }

  // Transacción: la identidad se elimina y el usuario huérfano (sin otras
  // identidades ni equipos) se limpia para evitar registros fantasma.
  await db.transaction(async (tx) => {
    await tx.orm.public.ProviderIdentity.whereUnique({ id: identity.id }).delete();
    const identityAgg = await tx.orm.public.ProviderIdentity
      .where({ userId: identity.userId })
      .aggregate((agg) => ({ remaining: agg.count() }));
    const memberAgg = await tx.orm.public.TeamMember
      .where({ userId: identity.userId })
      .aggregate((agg) => ({ memberships: agg.count() }));
    if (identityAgg.remaining === 0 && memberAgg.memberships === 0) {
      await tx.orm.public.User.whereUnique({ id: identity.userId }).delete();
    }
  });

  await writeAudit({
    actor: 'admin-token',
    action: 'discord.unlink',
    entity: 'ProviderIdentity',
    entityId: identity.id,
    detail: { providerId, userId: identity.userId },
  });
  return NextResponse.json({ ok: true });
}
