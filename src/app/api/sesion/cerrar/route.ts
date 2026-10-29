// POST /api/sesion/cerrar — logout: invalida la cookie (Max-Age=0).
// CERO borrados en DB: el perfil y las identidades (FACEIT incluida)
// sobreviven al logout y re-aparecen al volver a iniciar sesión.
import { NextResponse } from 'next/server';
import { cookieDeCierre } from '@/lib/sesion';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const https = new URL(req.url).protocol === 'https:';
  const res = NextResponse.json({ ok: true });
  res.headers.append('Set-Cookie', cookieDeCierre(https));
  return res;
}
