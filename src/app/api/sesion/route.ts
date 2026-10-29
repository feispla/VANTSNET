// GET /api/sesion — sesión actual (honesto: {sesion: null} si no la hay).
// Resuelve el UID de la cookie contra la D1 de preview y devuelve el
// perfil con sus identidades (Discord, FACEIT...).
import { NextRequest, NextResponse } from 'next/server';
import { sesionDeCookies } from '@/lib/sesion';
import { d1Preview, obtenerUsuarioConIdentidades } from '@/lib/store/d1';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const carga = await sesionDeCookies(req.headers.get('cookie'));
  if (!carga) {
    return NextResponse.json({ sesion: null });
  }
  const db = await d1Preview();
  if (!db) {
    return NextResponse.json(
      { error: 'Almacén D1 no disponible en este entorno.', code: 'NO_STORE' },
      { status: 503 }
    );
  }
  const usuario = await obtenerUsuarioConIdentidades(db, carga.uid);
  if (!usuario) {
    // Cookie válida pero usuario ya no existe: sesión zombi → honestamente null.
    return NextResponse.json({ sesion: null });
  }
  return NextResponse.json({
    sesion: {
      usuario: {
        id: usuario.id,
        displayName: usuario.displayName,
        createdAt: usuario.createdAt,
      },
      identidades: usuario.identidades,
    },
  });
}
