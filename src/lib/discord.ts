// Integración Discord — módulo centralizado (OAuth2 identidad, mínimo privilegio).
// Scope: identify (sin Administrator, sin permisos de bot en este prototipo).
// El client secret vive SOLO en el servidor; el state va firmado con HMAC-SHA256.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const DISCORD_AUTHORIZE_URL = 'https://discord.com/oauth2/authorize';
export const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
export const DISCORD_ME_URL = 'https://discord.com/api/users/@me';

export interface DiscordConfig {
  clientId: string;
  clientSecret: string;
  stateSecret: string;
  redirectUri: string;
}

export interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
  avatar: string | null;
}

export type DiscordErrorCode =
  | 'NOT_CONFIGURED'
  | 'INVALID_STATE'
  | 'EXPIRED_STATE'
  | 'TOKEN_EXCHANGE'
  | 'NETWORK';

export class DiscordError extends Error {
  code: DiscordErrorCode;
  status: number;
  constructor(code: DiscordErrorCode, message: string, status = 502) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function getDiscordConfig(): DiscordConfig | null {
  const clientId = process.env.DISCORD_CLIENT_ID?.trim();
  const clientSecret = process.env.DISCORD_CLIENT_SECRET?.trim();
  const stateSecret = process.env.DISCORD_OAUTH_STATE_SECRET?.trim();
  const redirectUri =
    process.env.DISCORD_REDIRECT_URI?.trim() ||
    (clientId ? undefined : undefined); // se resuelve por petición si falta
  if (!clientId || !clientSecret || !stateSecret) return null;
  return { clientId, clientSecret, stateSecret, redirectUri: redirectUri ?? '' };
}

export const isDiscordConfigured = () => getDiscordConfig() !== null;

/** Resuelve la redirect URI: env explícita o derivada del origen de la petición. */
export function resolveRedirectUri(reqUrl: string): string {
  const envUri = process.env.DISCORD_REDIRECT_URI?.trim();
  if (envUri) return envUri;
  const url = new URL(reqUrl);
  return `${url.origin}/api/auth/discord/callback`;
}

// ── State firmado: expiración.nonce.hmac ─────────────────────────────────────

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutos

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function buildState(stateSecret: string): string {
  const nonce = randomBytes(16).toString('base64url');
  const expiry = Date.now() + STATE_TTL_MS;
  const payload = `${expiry}.${nonce}`;
  return `${payload}.${sign(payload, stateSecret)}`;
}

export function verifyState(state: string, stateSecret: string): void {
  const parts = state.split('.');
  if (parts.length !== 3) throw new DiscordError('INVALID_STATE', 'El parámetro state es inválido.', 400);
  const [expiryRaw, nonce, sig] = parts;
  const payload = `${expiryRaw}.${nonce}`;
  const expected = sign(payload, stateSecret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new DiscordError('INVALID_STATE', 'La firma del state no coincide (posible CSRF).', 400);
  }
  const expiry = Number(expiryRaw);
  if (!Number.isFinite(expiry) || Date.now() > expiry) {
    throw new DiscordError('EXPIRED_STATE', 'El state ha expirado; vuelve a iniciar el enlace.', 400);
  }
}

// ── URLs y flujo ─────────────────────────────────────────────────────────────

export function buildAuthorizeUrl(cfg: DiscordConfig, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify',
    state,
    prompt: 'consent',
  });
  return `${DISCORD_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCode(
  cfg: DiscordConfig,
  redirectUri: string,
  code: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  let res: Response;
  try {
    res = await fetch(DISCORD_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });
  } catch {
    throw new DiscordError('NETWORK', 'No se pudo contactar con Discord (token).');
  }
  if (!res.ok) {
    throw new DiscordError('TOKEN_EXCHANGE', `Discord rechazó el intercambio de código (HTTP ${res.status}).`);
  }
  const data = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number };
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in };
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  let res: Response;
  try {
    res = await fetch(DISCORD_ME_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  } catch {
    throw new DiscordError('NETWORK', 'No se pudo contactar con Discord (users/@me).');
  }
  if (!res.ok) {
    throw new DiscordError('TOKEN_EXCHANGE', `Discord no devolvió el perfil (HTTP ${res.status}).`);
  }
  return (await res.json()) as DiscordUser;
}

export function avatarUrl(user: DiscordUser): string | null {
  if (!user.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
}
