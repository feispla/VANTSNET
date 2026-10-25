// Integración FACEIT — Data API v4 oficial (open.faceit.com).
// Requiere clave de servidor (FACEIT_API_KEY). Nunca se expone al cliente.
// Documentación: https://docs.faceit.com/docs

export const FACEIT_API_BASE = 'https://open.faceit.com/data/v4';

export interface FaceitPlayer {
  playerId: string;
  nickname: string;
  avatar: string | null;
  country: string;
  coverImage: string | null;
  memberships: string[];
  games: Record<string, { gamePlayerId: string; skillLevel: number; faceitElo: number }>;
}

export interface FaceitMatchItem {
  matchId: string;
  gameMode: string;
  playedAt: string;
  competitionName: string | null;
  teamA: string | null;
  teamB: string | null;
}

export type FaceitErrorCode =
  | 'NOT_CONFIGURED'
  | 'INVALID_KEY'
  | 'NOT_FOUND'
  | 'RATE_LIMIT'
  | 'NETWORK';

export class FaceitError extends Error {
  code: FaceitErrorCode;
  status: number;
  constructor(code: FaceitErrorCode, message: string, status = 502) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function faceitFetch<T>(path: string, key: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${FACEIT_API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new FaceitError('NETWORK', 'No se pudo contactar con la API de FACEIT.');
  }
  if (res.status === 401 || res.status === 403) {
    throw new FaceitError('INVALID_KEY', 'La clave de FACEIT es inválida o carece de permisos.', 502);
  }
  if (res.status === 404) {
    throw new FaceitError('NOT_FOUND', 'No existe ningún jugador de FACEIT con ese nickname.', 404);
  }
  if (res.status === 429) {
    throw new FaceitError('RATE_LIMIT', 'Límite de peticiones a FACEIT alcanzado; inténtalo en unos segundos.', 429);
  }
  if (!res.ok) {
    throw new FaceitError('NETWORK', `La API de FACEIT respondió con el estado HTTP ${res.status}.`);
  }
  return (await res.json()) as T;
}

interface RawPlayer {
  player_id: string;
  nickname: string;
  avatar?: string | null;
  country?: string;
  cover_image?: string | null;
  memberships?: string[];
  games?: Record<string, { game_player_id?: string; skill_level?: number; faceit_elo?: number }>;
}

interface RawHistory {
  items?: {
    match_id: string;
    game_mode?: string;
    started_at?: number;
    competition_name?: string;
    playing_members?: { team_id?: string; nickname?: string }[];
  }[];
}

/** Busca un jugador por nickname exacto. */
export async function fetchFaceitPlayer(nickname: string, keyInput?: string): Promise<FaceitPlayer> {
  const key = keyInput ?? process.env.FACEIT_API_KEY?.trim();
  if (!key) {
    throw new FaceitError(
      'NOT_CONFIGURED',
      'FACEIT no está configurado: define FACEIT_API_KEY en el servidor para activar la búsqueda.',
      503
    );
  }
  const raw = await faceitFetch<RawPlayer>(
    `/players?nickname=${encodeURIComponent(nickname)}`,
    key
  );
  const games: FaceitPlayer['games'] = {};
  for (const [gameId, g] of Object.entries(raw.games ?? {})) {
    games[gameId] = {
      gamePlayerId: g.game_player_id ?? '',
      skillLevel: g.skill_level ?? 0,
      faceitElo: g.faceit_elo ?? 0,
    };
  }
  return {
    playerId: raw.player_id,
    nickname: raw.nickname,
    avatar: raw.avatar ?? null,
    country: raw.country ?? '',
    coverImage: raw.cover_image ?? null,
    memberships: raw.memberships ?? [],
    games,
  };
}

/** Historial reciente de partidas de un jugador (máx. 20). */
export async function fetchFaceitHistory(playerId: string, limit = 10, keyInput?: string): Promise<FaceitMatchItem[]> {
  const key = keyInput ?? process.env.FACEIT_API_KEY?.trim();
  if (!key) {
    throw new FaceitError(
      'NOT_CONFIGURED',
      'FACEIT no está configurado: define FACEIT_API_KEY en el servidor.',
      503
    );
  }
  const safeLimit = Math.min(Math.max(1, limit), 20);
  const raw = await faceitFetch<RawHistory>(
    `/players/${encodeURIComponent(playerId)}/history?limit=${safeLimit}`,
    key
  );
  return (raw.items ?? []).map((it) => {
    const byTeam = new Map<string, string>();
    for (const m of it.playing_members ?? []) {
      if (m.team_id && m.nickname) {
        const list = byTeam.get(m.team_id);
        byTeam.set(m.team_id, list ? `${list}, ${m.nickname}` : m.nickname);
      }
    }
    const teams = [...byTeam.values()];
    return {
      matchId: it.match_id,
      gameMode: it.game_mode ?? '',
      playedAt: new Date((it.started_at ?? 0) * 1000).toISOString(),
      competitionName: it.competition_name ?? null,
      teamA: teams[0] ?? null,
      teamB: teams[1] ?? null,
    };
  });
}

export function isFaceitConfigured(): boolean {
  return Boolean(process.env.FACEIT_API_KEY?.trim());
}
