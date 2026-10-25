// GET /api/auth/discord/start — inicia el flujo OAuth2 de Discord (scope identify).
// Sin credenciales configuradas responde 503 con instrucciones (estado honesto).
import { NextRequest, NextResponse } from 'next/server';
import {
  buildAuthorizeUrl,
  buildState,
  DiscordError,
  getDiscordConfig,
  resolveRedirectUri,
} from '@/lib/discord';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cfg = getDiscordConfig();
  if (!cfg) {
    return NextResponse.json(
      {
        error:
          'Discord no está configurado en el servidor: define DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET y DISCORD_OAUTH_STATE_SECRET. Guía en docs/INTEGRATIONS.md.',
        code: 'NOT_CONFIGURED',
      },
      { status: 503 }
    );
  }
  try {
    const redirectUri = resolveRedirectUri(req.url);
    const state = buildState(cfg.stateSecret);
    return NextResponse.redirect(buildAuthorizeUrl(cfg, redirectUri, state));
  } catch (err) {
    if (err instanceof DiscordError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: 'No se pudo iniciar el enlace con Discord.' }, { status: 500 });
  }
}
