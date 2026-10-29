// POST /api/sesion/faceit — vincula la cuenta de FACEIT del usuario con
// sesión. Resuelve el nick contra la FACEIT Data API v4 (con la server key
// del servidor) y guarda la identidad (provider='faceit') en la D1 preview.
// La vinculación SOBREVIVE al logout/login: es una fila en
// provider_identities atada al uid, no un estado del navegador.
// DELETE — desvincula la identidad FACEIT del usuario con sesión.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sesionDeCookies } from '@/lib/sesion';
import { d1Preview, identidadesDe, vincularIdentidad } from '@/lib/store/d1';

export const dynamic = 'force-dynamic';

const esquema = z.object({
  nick: z.string().trim().regex(/^[a-zA-Z0-9_.\-]{2,24}$/, 'Nick de FACEIT inválido.'),
});

async function resolverNickFaceit(nick: string): Promise<{
  ok: boolean;
  motivo?: string;
  jugador?: { player_id: string; nickname: string; avatar?: string };
}> {
  const key = process.env.FACEIT_API_KEY?.trim();
  if (!key) return { ok: false, motivo: 'sin_api_key' };
  try {
    const res = await fetch(
      `https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(nick)}`,
      {
        headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(9000),
      }
    );
    if (res.status === 401 || res.status === 403) return { ok: false, motivo: 'faceit_key' };
    if (res.status === 404) return { ok: false, motivo: 'no_encontrado' };
    if (!res.ok) return { ok: false, motivo: 'faceit_no_responde' };
    const j = (await res.json()) as {
      player_id?: string;
      nickname?: string;
      avatar?: string;
    };
    if (!j.player_id) return { ok: false, motivo: 'no_encontrado' };
    return {
      ok: true,
      jugador: { player_id: j.player_id, nickname: j.nickname ?? nick, avatar: j.avatar },
    };
  } catch {
    return { ok: false, motivo: 'faceit_no_responde' };
  }
}

export async function POST(req: NextRequest) {
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
      { error: datos.error.issues[0]?.message ?? 'Nick inválido.', code: 'NICK_INVALIDO' },
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

  const r = await resolverNickFaceit(datos.data.nick);
  if (!r.ok || !r.jugador) {
    return NextResponse.json(
      { error: 'No se pudo resolver el nick en FACEIT.', code: r.motivo ?? 'faceit_error' },
      { status: 502 }
    );
  }

  const { identidad, creada } = await vincularIdentidad(db, {
    provider: 'faceit',
    providerId: r.jugador.player_id,
    displayName: r.jugador.nickname,
    avatarUrl: r.jugador.avatar ?? null,
    rawJson: JSON.stringify({ player_id: r.jugador.player_id, nickname: r.jugador.nickname }),
  });

  if (identidad.userId !== carga.uid) {
    return NextResponse.json(
      {
        error: 'Esa cuenta de FACEIT ya está vinculada a otro usuario de la preview.',
        code: 'identidad_ajena',
      },
      { status: 409 }
    );
  }

  const identidades = await identidadesDe(db, carga.uid);
  return NextResponse.json({
    ok: true,
    creada,
    faceit: { providerId: identidad.providerId, displayName: identidad.displayName },
    identidades: identidades.map((i) => ({
      provider: i.provider,
      providerId: i.providerId,
      displayName: i.displayName,
    })),
  });
}

export async function DELETE(req: NextRequest) {
  const carga = await sesionDeCookies(req.headers.get('cookie'));
  if (!carga) {
    return NextResponse.json({ error: 'Sesión requerida.', code: 'SIN_SESION' }, { status: 401 });
  }
  const db = await d1Preview();
  if (!db) {
    return NextResponse.json(
      { error: 'Almacén D1 no disponible en este entorno.', code: 'NO_STORE' },
      { status: 503 }
    );
  }
  await db
    .prepare("DELETE FROM provider_identities WHERE user_id = ? AND provider = 'faceit'")
    .bind(carga.uid)
    .run();
  return NextResponse.json({ ok: true });
}
