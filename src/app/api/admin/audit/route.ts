// GET /api/admin/audit — últimos registros de auditoría (admin).
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const takeParam = Number(req.nextUrl.searchParams.get('take') ?? '50');
  const take = Number.isFinite(takeParam) ? Math.min(Math.max(1, takeParam), 200) : 50;

  const entries = await db.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take,
  });
  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      actor: e.actor,
      action: e.action,
      entity: e.entity,
      entityId: e.entityId,
      detail: e.detailJson ? JSON.parse(e.detailJson) : null,
      createdAt: e.createdAt,
    })),
  });
}
