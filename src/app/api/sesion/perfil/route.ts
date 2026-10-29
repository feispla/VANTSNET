// PATCH /api/sesion/perfil — renombra el usuario (nombre personalizado).
// Exige sesión válida. El displayName del proveedor SOLO fue valor inicial:
// este endpoint es la única vía legítima de cambio y NUNCA lo sobrescribe
// una re-sincronización (regla de oro del plan).
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sesionDeCookies } from '@/lib/sesion';
import { actualizarDisplayName, d1Preview } from '@/lib/store/d1';

export const dynamic = 'force-dynamic';

const esquema = z.object({
  displayName: z.string().trim().min(2, 'Mínimo 2 caracteres.').max(32, 'Máximo 32 caracteres.'),
});

export async function PATCH(req: NextRequest) {
  const carga = await sesionDeCookies(req.headers.get('cookie'));
  if (!carga) {
    return NextResponse.json({ error: 'Sesión requerida.', code: 'SIN_SESION' }, { status: 401 });
  }
  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido.' }, { status: 400 });
  }
  const datos = esquema.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: datos.error.issues[0]?.message ?? 'Nombre inválido.', code: 'NOMBRE_INVALIDO' },
      { status: 400 }
    );
  }
  const db = await d1Preview();
  if (!db) {
    return NextResponse.json(
      { error: 'Almacén D1 no disponible en este entorno.', code: 'NO_STORE' },
      { status: 503 }
    );
  }
  const usuario = await actualizarDisplayName(db, carga.uid, datos.data.displayName);
  if (!usuario) {
    return NextResponse.json({ error: 'Usuario no encontrado.', code: 'SIN_USUARIO' }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    usuario: { id: usuario.id, displayName: usuario.displayName },
  });
}
