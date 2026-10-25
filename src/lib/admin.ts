// Autenticación de operaciones de administración (prototipo).
// Token compartido vía header X-Admin-Token comparado en tiempo constante.
// Producción planificada: sesiones OAuth (Discord) + roles (ver docs/SECURITY.md).
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

export const ADMIN_NOT_CONFIGURED =
  'Operaciones de administración deshabilitadas: define ADMIN_TOKEN en el entorno del servidor.';

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Devuelve una Response de error si la petición no está autorizada,
 * o null si es válida y puede continuar.
 */
export function requireAdmin(req: NextRequest): NextResponse | null {
  const expected = process.env.ADMIN_TOKEN?.trim();
  if (!expected) {
    return NextResponse.json(
      { error: ADMIN_NOT_CONFIGURED, code: 'ADMIN_NOT_CONFIGURED' },
      { status: 503 }
    );
  }
  const provided = req.headers.get('x-admin-token')?.trim() ?? '';
  if (!provided || !safeEqual(provided, expected)) {
    return NextResponse.json(
      { error: 'Token de administración inválido.', code: 'ADMIN_INVALID' },
      { status: 401 }
    );
  }
  return null;
}

export const isAdminConfigured = () => Boolean(process.env.ADMIN_TOKEN?.trim());
