// GET /api/auth/discord/callback — valida state, intercambia el código y vincula
// la identidad de Discord con un usuario interno (idempotente vía unique).
// Al terminar CREA LA SESIÓN (cookie HttpOnly firmada) del usuario vinculado.
// Almacén dual: D1 de preview (binding DB, SQL directo) si está disponible;
// si no, Prisma sobre PostgreSQL (ruta pg original, intacta).
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  avatarUrl,
  DiscordError,
  exchangeCode,
  fetchDiscordUser,
  getDiscordConfig,
  resolveRedirectUri,
  verifyState,
} from '@/lib/discord';
import { cookieDeSesion } from '@/lib/sesion';
import { d1Preview, vincularIdentidad } from '@/lib/store/d1';

export const dynamic = 'force-dynamic';

function backToApp(
  reqUrl: string,
  result: 'linked' | 'error',
  reason?: string,
  cookieSesion?: { name: string; attributes: string }
): NextResponse {
  const origin = new URL(reqUrl).origin;
  const url = new URL('/', origin);
  url.searchParams.set('auth', result);
  if (reason) url.searchParams.set('reason', reason);
  const res = NextResponse.redirect(url.toString());
  if (cookieSesion) res.headers.append('Set-Cookie', cookieSesion.attributes);
  return res;
}

export async function GET(req: NextRequest) {
  const cfg = getDiscordConfig();
  if (!cfg) {
    return backToApp(req.url, 'error', 'discord-no-configurado');
  }

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const oauthError = req.nextUrl.searchParams.get('error');
  if (oauthError) {
    return backToApp(req.url, 'error', 'autorizacion-cancelada');
  }
  if (!code || !state) {
    return backToApp(req.url, 'error', 'falta-codigo-o-state');
  }

  try {
    verifyState(state, cfg.stateSecret);
    const redirectUri = resolveRedirectUri(req.url);
    const tokens = await exchangeCode(cfg, redirectUri, code);
    const me = await fetchDiscordUser(tokens.accessToken);

    // Vinculación idempotente: si la identidad ya existe se actualiza; si no,
    // se crea (o reutiliza) un usuario interno y se enlaza.
    // REGLA DE ORO: el displayName del proveedor SOLO es valor inicial —
    // nunca sobrescribe el nombre personalizado del usuario.
    const displayName = me.global_name || me.username;
    const dbD1 = await d1Preview();
    let uid: string;
    if (dbD1) {
      // Preview: D1 (SQL directo). La re-sincronización actualiza la IDENTIDAD,
      // jamás el displayName del usuario.
      const { usuario } = await vincularIdentidad(dbD1, {
        provider: 'discord',
        providerId: me.id,
        displayName,
        avatarUrl: avatarUrl(me),
        rawJson: JSON.stringify(me),
      });
      uid = usuario.id;
    } else {
      await db.transaction(async (tx) => {
        const existing = await tx.orm.public.ProviderIdentity
          .whereUnique({ provider: 'discord', providerId: me.id })
          .first();
        if (existing) {
          await tx.orm.public.ProviderIdentity.where({ id: existing.id }).update({
            displayName,
            avatarUrl: avatarUrl(me),
            lastSyncAt: new Date().toISOString(),
          });
          return;
        }
        const user = await tx.orm.public.User.create({ displayName });
        await tx.orm.public.ProviderIdentity.create({
          provider: 'discord',
          providerId: me.id,
          displayName,
          avatarUrl: avatarUrl(me),
          lastSyncAt: new Date().toISOString(),
          userId: user.id,
        });
      });
      // En la ruta pg el uid se resuelve por identidad (mismo contrato).
      const identidadPg = await db.orm.public.ProviderIdentity
        .whereUnique({ provider: 'discord', providerId: me.id })
        .first();
      if (!identidadPg) throw new Error('no se pudo resolver la identidad pg');
      uid = identidadPg.userId;
    }

    const https = new URL(req.url).protocol === 'https:';
    const cookie = await cookieDeSesion(uid, https);
    return backToApp(req.url, 'linked', undefined, { name: cookie.name, attributes: cookie.attributes });
  } catch (err) {
    if (err instanceof DiscordError) {
      return backToApp(req.url, 'error', `discord-${err.code.toLowerCase()}`);
    }
    console.error('discord-callback', err);
    return backToApp(req.url, 'error', 'error-interno');
  }
}
