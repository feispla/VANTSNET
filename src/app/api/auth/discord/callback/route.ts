// GET /api/auth/discord/callback — valida state, intercambia el código y vincula
// la identidad de Discord con un usuario interno (idempotente vía unique).
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

export const dynamic = 'force-dynamic';

function backToApp(reqUrl: string, result: 'linked' | 'error', reason?: string): NextResponse {
  const origin = new URL(reqUrl).origin;
  const url = new URL('/', origin);
  url.searchParams.set('auth', result);
  if (reason) url.searchParams.set('reason', reason);
  return NextResponse.redirect(url.toString());
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
    const displayName = me.global_name || me.username;
    const identity = await db.providerIdentity.upsert({
      where: { provider_providerId: { provider: 'discord', providerId: me.id } },
      update: { displayName, avatarUrl: avatarUrl(me), lastSyncAt: new Date() },
      create: {
        provider: 'discord',
        providerId: me.id,
        displayName,
        avatarUrl: avatarUrl(me),
        lastSyncAt: new Date(),
        user: {
          create: { displayName },
        },
      },
      include: { user: true },
    });

    return backToApp(req.url, 'linked');
  } catch (err) {
    if (err instanceof DiscordError) {
      return backToApp(req.url, 'error', `discord-${err.code.toLowerCase()}`);
    }
    console.error('discord-callback', err);
    return backToApp(req.url, 'error', 'error-interno');
  }
}
