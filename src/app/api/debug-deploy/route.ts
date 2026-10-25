// GET /api/debug-deploy — diagnóstico TEMPORAL del despliegue en Prisma Cloud.
// No importa el módulo de BD en el nivel del módulo: todo va diferido dentro
// del handler con try/catch, para capturar el error exacto de inicialización
// que produce el "Internal Server Error" plano de las rutas API.
// Nunca devuelve valores de variables de entorno, solo nombres y longitudes,
// y redacta cualquier URL que aparezca en un mensaje de error.
// Se elimina en cuanto se identifica la causa (ver docs/KNOWN_ISSUES.md KT-003).
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const redact = (s: string): string =>
  s
    .replace(/postgres(?:s)?:\/\/[^\s'"`)]+/gi, 'postgres://***')
    .replace(/sk_[A-Za-z0-9_-]+/g, 'sk_***')
    .slice(0, 700);

const bunGlobal = (globalThis as { Bun?: { version: string } }).Bun;

export async function GET() {
  const envNames = Object.keys(process.env)
    .filter((k) => /^(COMPOSER_|DATABASE|PORT$|HOST|NODE_ENV|NEXT_RUNTIME)/.test(k))
    .sort();

  const report: Record<string, unknown> = {
    time: new Date().toISOString(),
    runtime: bunGlobal ? `bun ${bunGlobal.version}` : `node ${process.version}`,
    cwd: process.cwd(),
    envNames,
    urlPresent: {
      DATABASE_URL: Boolean(process.env.DATABASE_URL),
      COMPOSER_VANTSNET_DB_URL: Boolean(process.env.COMPOSER_VANTSNET_DB_URL),
    },
    resolvedUrlLength: (process.env.DATABASE_URL ?? process.env.COMPOSER_VANTSNET_DB_URL ?? '').length,
  };

  try {
    const mod = await import('@/prisma/db');
    report.dbModule = 'loaded';
    try {
      await mod.db.query(mod.db.raw.sql`SELECT 1 AS ok`.returnsRow({ ok: 'pg/int4@1' }).build());
      report.query = 'ok';
    } catch (e) {
      report.query = 'error: ' + redact(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    }
  } catch (e) {
    report.dbModule =
      'init-crash: ' + redact(e instanceof Error ? (e.stack ?? e.message) : String(e));
  }

  return NextResponse.json(report, { status: 200 });
}
