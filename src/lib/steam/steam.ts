// Cliente de la Steam Web API (solo servidor) — primera fuente de datos de juegos de Steam.
// Patrón VANTSNET: mismos convenios que lib/valorant/riot.ts (errores tipados en español,
// fetch sin caché con timeout, la clave NUNCA sale del backend).

export type SteamErrorCode =
  | 'NO_KEY'
  | 'INVALID_KEY'
  | 'NOT_FOUND'
  | 'PRIVATE_PROFILE'
  | 'RATE_LIMIT'
  | 'NETWORK'
  | 'NO_DATA';

export class SteamError extends Error {
  code: SteamErrorCode;
  constructor(code: SteamErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const STEAM_API = 'https://api.steampowered.com';

// ── Clave (solo backend) ──
export function getSteamKey(): string {
  return process.env.STEAM_API_KEY || '';
}

function requireSteamKey(): string {
  const key = getSteamKey();
  if (!key) {
    throw new SteamError(
      'NO_KEY',
      'No hay STEAM_API_KEY configurada en el backend. Consigue una gratis en steamcommunity.com/dev/apikey.'
    );
  }
  return key;
}

// ── Fetch base con mapeo de errores de la Steam Web API ──
async function steamFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = requireSteamKey();
  const url = new URL(STEAM_API + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('key', key); // la clave viaja solo servidor → Steam

  return fetch(url.toString(), {
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  }).then(async (res) => {
    if (res.status === 403) {
      throw new SteamError('INVALID_KEY', 'Clave de Steam Web API inválida o revocada. Genera otra en steamcommunity.com/dev/apikey.');
    }
    if (res.status === 429) {
      throw new SteamError('RATE_LIMIT', 'Límite de peticiones a Steam alcanzado (100.000 llamadas/día). Espera unos minutos.');
    }
    if (!res.ok) {
      throw new SteamError('NETWORK', `La Steam Web API respondió con el estado ${res.status}.`);
    }
    return res.json() as Promise<T>;
  }, () => {
    throw new SteamError('NETWORK', 'No se pudo conectar con la Steam Web API.');
  });
}

// ── Resolución de entradas de usuario ──
const STEAMID64_RE = /^\d{17}$/;

export function isSteamId64(s: string): boolean {
  return STEAMID64_RE.test(s);
}

export type SteamInput =
  | { type: 'steamid'; value: string }
  | { type: 'vanity'; value: string };

/** Acepta: steamid64, URL /profiles/<id>, URL /id/<vanity> o nombre de vanity directo. */
export function parseSteamInput(raw: string): SteamInput {
  const q = raw.trim();
  if (STEAMID64_RE.test(q)) return { type: 'steamid', value: q };

  const profiles = q.match(/steamcommunity\.com\/profiles\/(\d{17})/i);
  if (profiles) return { type: 'steamid', value: profiles[1] };

  const idUrl = q.match(/steamcommunity\.com\/id\/([^/?#\s]+)/i);
  if (idUrl) return { type: 'vanity', value: idUrl[1] };

  if (/^[A-Za-z0-9_-]{2,64}$/.test(q)) return { type: 'vanity', value: q };

  throw new SteamError(
    'NOT_FOUND',
    'Entrada no reconocida. Usa un SteamID64 (17 dígitos), tu vanity URL (steamcommunity.com/id/...) o el nombre de la URL personalizada.'
  );
}

// ── ISteamUser/ResolveVanityURL: vanity → steamid64 ──
export async function resolveVanityUrl(vanity: string): Promise<string> {
  const data = await steamFetch<{ response: { success: number; steamid?: string } }>(
    '/ISteamUser/ResolveVanityURL/v1/', { vanityurl: vanity }
  );
  if (data.response?.success === 1 && data.response.steamid) return data.response.steamid;
  throw new SteamError('NOT_FOUND', `No existe un perfil de Steam con la URL personalizada "${vanity}".`);
}

// ── ISteamUser/GetPlayerSummaries ──
export interface SteamPlayerSummary {
  steamid: string;
  personaname: string;
  profileurl: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
  personastate: number;
  communityvisibilitystate: number; // 3 = público
  realname?: string;
  timecreated?: number; // epoch seg.
  loccountrycode?: string;
  lastlogoff?: number;
}

export async function getPlayerSummaries(steamids: string[]): Promise<SteamPlayerSummary[]> {
  const data = await steamFetch<{ response: { players?: SteamPlayerSummary[] } }>(
    '/ISteamUser/GetPlayerSummaries/v0002/', { steamids: steamids.join(',') }
  );
  return data.response?.players ?? [];
}

// ── IPlayerService/GetOwnedGames (requiere perfil público) ──
export interface SteamOwnedGame {
  appid: number;
  name?: string;
  playtime_forever: number; // minutos
  playtime_2weeks?: number;
  rtime_last_played?: number;
}

export async function getOwnedGames(steamid: string): Promise<SteamOwnedGame[]> {
  const data = await steamFetch<{ response: { games?: SteamOwnedGame[]; game_count?: number } }>(
    '/IPlayerService/GetOwnedGames/v1/', {
      steamid,
      include_appinfo: 'true',
      include_played_free_games: 'true',
    }
  );
  // Steam responde {"response":{}} si el perfil es privado o sin juegos
  if (!data.response || (!data.response.games && data.response.game_count === undefined)) {
    throw new SteamError(
      'PRIVATE_PROFILE',
      'Los detalles del juego de este perfil no están disponibles: el perfil de Steam es privado. Se puede activar en Configuración de privacidad → Detalles del juego: Público.'
    );
  }
  return data.response.games ?? [];
}

// ── Flujo completo: entrada del usuario → perfil + juegos ──
export interface SteamProfileResult {
  steamid: string;
  player: SteamPlayerSummary;
  games: SteamOwnedGame[]; // ordenadas por tiempo de juego, descendente
}

export async function fetchSteamProfile(query: string): Promise<SteamProfileResult> {
  const input = parseSteamInput(query);
  const steamid = input.type === 'steamid' ? input.value : await resolveVanityUrl(input.value);

  const players = await getPlayerSummaries([steamid]);
  if (players.length === 0) {
    throw new SteamError('NOT_FOUND', `No se encontró ningún perfil de Steam para el identificador ${steamid}.`);
  }

  let games: SteamOwnedGame[] = [];
  try {
    games = (await getOwnedGames(steamid))
      .sort((a, b) => (b.playtime_forever ?? 0) - (a.playtime_forever ?? 0));
  } catch (err) {
    // El resumen del perfil sigue siendo útil aunque los detalles del juego sean privados
    if (!(err instanceof SteamError) || err.code !== 'PRIVATE_PROFILE') throw err;
  }

  return { steamid, player: players[0], games };
}
