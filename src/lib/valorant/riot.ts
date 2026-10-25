// Cliente de la API oficial de Riot (solo servidor) + persistencia + agregación
// Patrón VANTSNET: caché en BD (partidas se guardan UNA vez), errores tipados en español.

import { db } from '@/lib/db';
import type {
  AgentSummary,
  MatchSummary,
  ProfileAggregate,
  ProfileResponse,
} from './types';

export type RiotErrorCode =
  | 'NO_KEY'
  | 'INVALID_KEY'
  | 'FORBIDDEN_PRODUCT'
  | 'NOT_FOUND'
  | 'RATE_LIMIT'
  | 'NETWORK'
  | 'NO_DATA';

export class RiotError extends Error {
  code: RiotErrorCode;
  // Cuenta resuelta por account-v1 antes del fallo (para mostrar "cuenta verificada")
  account?: { gameName: string; tagLine: string; puuid: string };
  constructor(code: RiotErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export const RIOT_REGIONS = ['europe', 'americas', 'asia'] as const;
export type RiotRegion = (typeof RIOT_REGIONS)[number];

export function isRiotRegion(r: string): r is RiotRegion {
  return (RIOT_REGIONS as readonly string[]).includes(r);
}

const MODE_LABELS: Record<string, string> = {
  competitive: 'Competitivo',
  unrated: 'No clasificatorio',
  swiftplay: 'Swiftplay',
  spike: 'Spike Rush',
  deathmatch: 'Combate a muerte',
  teamdeathmatch: 'Combate por equipos',
  escalation: 'Escalación',
  ggteam: 'Duelo TNT',
  onefaucet: 'Escalación',
};

const MATCH_COUNT = 8;

function riotFetch<T>(region: RiotRegion, path: string, key: string): Promise<T> {
  const url = `https://${region}.api.riotgames.com${path}`;
  return fetch(url, {
    headers: { 'X-Riot-Token': key },
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  }).then(async (res) => {
    if (res.status === 404) {
      throw new RiotError('NOT_FOUND', 'Jugador no encontrado. Revisa el Nombre#TAG y la región.');
    }
    if (res.status === 403) {
      if (path.startsWith('/val/')) {
        // Política oficial de Riot: los endpoints de Valorant (VAL-MATCH-V1, VAL-CONTENT-V1...)
        // no están disponibles para claves de desarrollo/personales, solo para claves de producción.
        throw new RiotError(
          'FORBIDDEN_PRODUCT',
          'Tu API key es válida, pero Riot Games reserva los datos de partidas de Valorant (VAL-MATCH-V1) para claves de producción: las claves de desarrollo ya no incluyen acceso a Valorant. Puedes solicitar una clave de producción en developer.riotgames.com presentando este prototipo como evidencia. El modo demo sigue disponible.'
        );
      }
      throw new RiotError('INVALID_KEY', 'API key inválida o expirada. Genera una nueva en developer.riotgames.com');
    }
    if (res.status === 429) {
      throw new RiotError('RATE_LIMIT', 'Límite de peticiones alcanzado (rate limit). Espera unos minutos e inténtalo de nuevo.');
    }
    if (!res.ok) {
      throw new RiotError('NETWORK', `La API de Riot respondió con el estado ${res.status}.`);
    }
    return res.json() as Promise<T>;
  }, () => {
    throw new RiotError('NETWORK', 'No se pudo conectar con la API de Riot.');
  });
}

// ── Caché en memoria del contenido (mapas/agentes), patrón "content cache" ──
interface ContentCache {
  mapNameByMapUrl: Record<string, string>;
  agentNameByUuid: Record<string, string>;
  fetchedAt: number;
}
let contentCache: ContentCache | null = null;
const CONTENT_TTL = 24 * 60 * 60 * 1000;

interface RiotContent {
  characters: { name: string; uuid: string }[];
  maps: { name: string; uuid: string; mapUrl?: string }[];
}

async function getContent(region: RiotRegion, key: string): Promise<ContentCache> {
  if (contentCache && Date.now() - contentCache.fetchedAt < CONTENT_TTL) return contentCache;
  const data = await riotFetch<RiotContent>(region, '/val/content/v1/contents?locale=es-ES', key);
  const mapNameByMapUrl: Record<string, string> = {};
  for (const m of data.maps ?? []) {
    if (m.mapUrl) mapNameByMapUrl[m.mapUrl] = m.name;
  }
  const agentNameByUuid: Record<string, string> = {};
  for (const c of data.characters ?? []) agentNameByUuid[c.uuid] = c.name;
  contentCache = { mapNameByMapUrl, agentNameByUuid, fetchedAt: Date.now() };
  return contentCache;
}

// ── Tipos crudos de VAL-MATCH-V1 ──
interface RawMatch {
  matchInfo: {
    matchId: string;
    mapId: string;
    gameLengthMillis: number;
    gameStartMillis: number;
    queueID?: string;
    isCompleted?: boolean;
  };
  players: {
    puuid: string;
    gameName: string;
    tagLine: string;
    teamId: string;
    characterId: string;
    stats: {
      kills: number;
      deaths: number;
      assists: number;
      score: number;
      scorePerRound: number;
    };
    damage_made?: number;
    damage_received?: number;
    headshots?: number;
    bodyshots?: number;
    legshots?: number;
  }[];
  teams: { teamId: string; won: boolean; roundsWon: number; roundsPlayed: number }[];
}

const prettyMap = (mapUrlOrName: string) => {
  const known: Record<string, string> = {
    '/Game/Maps/Ascent/Ascent': 'Ascent',
    '/Game/Maps/Port/Port': 'Icebox',
    '/Game/Maps/Duality/Duality': 'Bind',
    '/Game/Maps/Triad/Triad': 'Haven',
    '/Game/Maps/Ascent/Ascent_Main': 'Ascent',
  };
  return known[mapUrlOrName] ?? mapUrlOrName.split('/').pop()?.replace('_Main', '') ?? 'Mapa';
};

async function fetchAndStoreMatch(matchId: string, region: RiotRegion, key: string) {
  const raw = await riotFetch<RawMatch>(region, `/val/match/v1/matches/${matchId}`, key);
  const content = await getContent(region, key);
  const mapName = content.mapNameByMapUrl[raw.matchInfo.mapId] ?? prettyMap(raw.matchInfo.mapId);
  const mode = raw.matchInfo.queueID ?? 'unknown';
  const teams = raw.teams ?? [];
  const roundsPlayed = teams[0]?.roundsPlayed ?? 0;
  const teamWon = new Map(teams.map((t) => [t.teamId, t.won]));

  const players = (raw.players ?? []).map((p) => ({
    puuid: p.puuid,
    gameName: p.gameName,
    tagLine: p.tagLine,
    teamId: p.teamId,
    agentId: p.characterId,
    agentName: content.agentNameByUuid[p.characterId] ?? 'Desconocido',
    kills: p.stats?.kills ?? 0,
    deaths: p.stats?.deaths ?? 0,
    assists: p.stats?.assists ?? 0,
    score: p.stats?.score ?? 0,
    scorePerRound: p.stats?.scorePerRound ?? 0,
    roundsPlayed,
    damageMade: p.damage_made ?? 0,
    damageReceived: p.damage_received ?? 0,
    headshots: p.headshots ?? 0,
    bodyshots: p.bodyshots ?? 0,
    legshots: p.legshots ?? 0,
    won: teamWon.get(p.teamId) ?? false,
  }));

  await db.match.upsert({
    where: { externalId: raw.matchInfo.matchId },
    update: { raw: JSON.stringify(raw) },
    create: {
      game: 'valorant',
      externalId: raw.matchInfo.matchId,
      mapId: raw.matchInfo.mapId,
      mapName,
      mode,
      modeLabel: MODE_LABELS[mode] ?? mode,
      startedAt: new Date(raw.matchInfo.gameStartMillis),
      durationMs: raw.matchInfo.gameLengthMillis,
      roundsPlayed,
      teamsJson: JSON.stringify(teams),
      raw: JSON.stringify(raw),
      players: { create: players },
    },
  });

  // También registra a todos los jugadores vistos (patrón "players" del blueprint)
  for (const p of players) {
    if (p.puuid) {
      await db.player.upsert({
        where: { puuid: p.puuid },
        update: { gameName: p.gameName, tagLine: p.tagLine, region },
        create: {
          game: 'valorant',
          puuid: p.puuid,
          gameName: p.gameName || 'Desconocido',
          tagLine: p.tagLine || '',
          region,
        },
      });
    }
  }
}

async function resolveAccount(riotId: string, region: RiotRegion, key: string) {
  const sep = riotId.lastIndexOf('#');
  const gameName = riotId.slice(0, sep);
  const tagLine = riotId.slice(sep + 1);
  const enc = `${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  const acc = await riotFetch<{ puuid: string; gameName: string; tagLine: string }>(
    region, `/riot/account/v1/accounts/by-riot-id/${enc}`, key
  );
  await db.player.upsert({
    where: { puuid: acc.puuid },
    update: { gameName: acc.gameName, tagLine: acc.tagLine, region, lastFetchedAt: new Date() },
    create: {
      game: 'valorant',
      puuid: acc.puuid,
      gameName: acc.gameName,
      tagLine: acc.tagLine,
      region,
      lastFetchedAt: new Date(),
    },
  });
  return acc;
}

// ── Agregación desde la BD (igual para datos reales que serviría el núcleo VANTSNET) ──
export async function buildProfile(
  puuid: string,
  player: { gameName: string; tagLine: string; region: string },
  demo: boolean
): Promise<ProfileResponse> {
  const stats = await db.matchPlayerStat.findMany({
    where: { puuid },
    include: { match: true },
    orderBy: { match: { startedAt: 'desc' } },
  });

  const agg: ProfileAggregate = {
    matches: stats.length, wins: 0, kills: 0, deaths: 0, assists: 0,
    kd: 0, adr: 0, acs: 0, hsPct: 0,
  };
  const agentMap = new Map<string, AgentSummary & { _d: number; _h: number; _s: number }>();
  let rounds = 0, damage = 0, score = 0, hs = 0, shots = 0;
  const matches: MatchSummary[] = [];

  for (const s of stats) {
    const shotsTotal = (s.headshots + s.bodyshots + s.legshots) || s.kills * 3;
    if (s.won) agg.wins++;
    agg.kills += s.kills; agg.deaths += s.deaths; agg.assists += s.assists;
    rounds += s.roundsPlayed || 0;
    damage += s.damageMade;
    score += s.scorePerRound > 0 ? Math.round(s.scorePerRound * (s.roundsPlayed || 0)) : 0;
    hs += s.headshots;
    shots += shotsTotal;

    const a = agentMap.get(s.agentName) ?? {
      name: s.agentName, uuid: s.agentId, matches: 0, wins: 0,
      kills: 0, deaths: 0, assists: 0, kd: 0, winrate: 0,
      _d: 0, _h: 0, _s: 0,
    };
    a.matches++; if (s.won) a.wins++;
    a.kills += s.kills; a.deaths += s.deaths; a.assists += s.assists;
    a._h += s.headshots; a._s += shotsTotal;
    agentMap.set(s.agentName, a);

    matches.push({
      externalId: s.match.externalId,
      mapName: s.match.mapName,
      mode: s.match.mode,
      modeLabel: s.match.modeLabel,
      playedAt: s.match.startedAt.toISOString(),
      durationMs: s.match.durationMs,
      won: s.won,
      roundsWon: s.won ? Math.max(13, Math.ceil((s.match.roundsPlayed || 0) / 2)) : Math.floor((s.match.roundsPlayed || 0) / 2),
      roundsLost: s.won ? Math.floor((s.match.roundsPlayed || 0) / 2) : Math.max(13, Math.ceil((s.match.roundsPlayed || 0) / 2)),
      kills: s.kills, deaths: s.deaths, assists: s.assists,
      acs: Math.round(s.scorePerRound),
      hsPct: shotsTotal > 0 ? Math.round((s.headshots / shotsTotal) * 100) : 0,
      agentName: s.agentName,
      agentUuid: s.agentId,
    });
  }

  agg.winrate = agg.matches ? Math.round((agg.wins / agg.matches) * 100) : 0;
  agg.kd = agg.deaths ? Math.round((agg.kills / agg.deaths) * 100) / 100 : agg.kills;
  agg.adr = rounds ? Math.round(damage / rounds) : 0;
  agg.acs = rounds ? Math.round(score / rounds) : 0;
  agg.hsPct = shots ? Math.round((hs / shots) * 100) : 0;

  return {
    demo,
    player: { puuid, gameName: player.gameName, tagLine: player.tagLine, region: player.region },
    aggregate: agg,
    agents: [...agentMap.values()].map((a) => ({
      name: a.name, uuid: a.uuid, matches: a.matches, wins: a.wins,
      kills: a.kills, deaths: a.deaths, assists: a.assists,
      kd: a.deaths ? Math.round((a.kills / a.deaths) * 100) / 100 : a.kills,
      winrate: Math.round((a.wins / a.matches) * 100),
      hsPct: a._s ? Math.round((a._h / a._s) * 100) : 0,
    })).sort((x, y) => y.matches - x.matches),
    matches,
  };
}

export async function fetchProfileReal(riotId: string, region: RiotRegion, key: string): Promise<ProfileResponse> {
  const acc = await resolveAccount(riotId, region, key);
  let ids: string[];
  try {
    ids = await riotFetch<string[]>(
      region, `/val/match/v1/matches/by-puuid/${acc.puuid}/ids?start=0&count=${MATCH_COUNT}`, key
    );
  } catch (err) {
    // Adjunta la cuenta ya verificada al error para que la UI pueda mostrarla
    if (err instanceof RiotError && err.code === 'FORBIDDEN_PRODUCT') {
      err.account = { gameName: acc.gameName, tagLine: acc.tagLine, puuid: acc.puuid };
    }
    throw err;
  }
  if (!ids || ids.length === 0) {
    throw new RiotError('NO_DATA', 'Este jugador no tiene partidas recientes registradas en la API de Valorant.');
  }
  for (const id of ids) {
    const existing = await db.match.findUnique({ where: { externalId: id }, select: { id: true } });
    if (!existing) {
      await fetchAndStoreMatch(id, region, key); // cada partida se colecta UNA sola vez
    }
  }
  return buildProfile(acc.puuid, { gameName: acc.gameName, tagLine: acc.tagLine, region }, false);
}

export async function fetchMatchReal(matchId: string, region: RiotRegion, key: string) {
  const existing = await db.match.findUnique({
    where: { externalId: matchId },
    include: { players: true },
  });
  if (existing) return existing;

  // verifica que el id exista en Riot antes de guardar
  const raw = await riotFetch<RawMatch>(region, `/val/match/v1/matches/${matchId}`, key);
  const content = await getContent(region, key);
  const mapName = content.mapNameByMapUrl[raw.matchInfo.mapId] ?? prettyMap(raw.matchInfo.mapId);
  const mode = raw.matchInfo.queueID ?? 'unknown';
  const teams = raw.teams ?? [];
  const roundsPlayed = teams[0]?.roundsPlayed ?? 0;
  const teamWon = new Map(teams.map((t) => [t.teamId, t.won]));

  await db.match.upsert({
    where: { externalId: raw.matchInfo.matchId },
    update: { raw: JSON.stringify(raw) },
    create: {
      game: 'valorant',
      externalId: raw.matchInfo.matchId,
      mapId: raw.matchInfo.mapId,
      mapName,
      mode,
      modeLabel: MODE_LABELS[mode] ?? mode,
      startedAt: new Date(raw.matchInfo.gameStartMillis),
      durationMs: raw.matchInfo.gameLengthMillis,
      roundsPlayed,
      teamsJson: JSON.stringify(teams),
      raw: JSON.stringify(raw),
      players: {
        create: (raw.players ?? []).map((p) => ({
          puuid: p.puuid,
          gameName: p.gameName,
          tagLine: p.tagLine,
          teamId: p.teamId,
          agentId: p.characterId,
          agentName: content.agentNameByUuid[p.characterId] ?? 'Desconocido',
          kills: p.stats?.kills ?? 0,
          deaths: p.stats?.deaths ?? 0,
          assists: p.stats?.assists ?? 0,
          score: p.stats?.score ?? 0,
          scorePerRound: p.stats?.scorePerRound ?? 0,
          roundsPlayed,
          damageMade: p.damage_made ?? 0,
          damageReceived: p.damage_received ?? 0,
          headshots: p.headshots ?? 0,
          bodyshots: p.bodyshots ?? 0,
          legshots: p.legshots ?? 0,
          won: teamWon.get(p.teamId) ?? false,
        })),
      },
    },
  });

  const saved = await db.match.findUnique({ where: { externalId: matchId }, include: { players: true } });
  if (!saved) throw new RiotError('NETWORK', 'No se pudo guardar la partida.');
  return saved;
}
