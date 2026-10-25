// GET /api/health — estado del servicio y de integraciones (sin secretos).
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAdminConfigured } from '@/lib/admin';
import { isDiscordConfigured } from '@/lib/discord';
import { isFaceitConfigured } from '@/lib/faceit';

export const dynamic = 'force-dynamic';

export async function GET() {
  let database: 'ok' | 'error' = 'ok';
  try {
    // Sonda mínima contra la base de datos (equivalente al SELECT 1 de v6)
    await db.query(db.raw.sql`SELECT 1 AS ok`.returnsRow({ ok: 'pg/int4@1' }).build());
  } catch {
    database = 'error';
  }

  return NextResponse.json(
    {
      status: database === 'ok' ? 'healthy' : 'degraded',
      service: 'vantsnet',
      time: new Date().toISOString(),
      checks: {
        database,
        integrations: {
          riot: Boolean(process.env.RIOT_API_KEY?.trim()),
          steam: Boolean(process.env.STEAM_API_KEY?.trim()),
          discord: isDiscordConfigured(),
          faceit: isFaceitConfigured(),
        },
        admin: isAdminConfigured(),
      },
    },
    { status: database === 'ok' ? 200 : 503 }
  );
}
