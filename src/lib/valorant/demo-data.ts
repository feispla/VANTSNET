// Datos simulados del modo demo — VANTSNET
// Genera un perfil y 8 partidas deterministas para Demo#VANTS
// (permite probar la plataforma sin API key de Riot)

import type {
  MatchDetailResponse,
  MatchSummary,
  MatchTeam,
  ProfileResponse,
} from './types';

export const DEMO_RIOT_ID = 'demo#vants';
export const DEMO_PUUID = 'demo-puuid-0000-vantsnet';

interface DemoAgent {
  name: string;
  uuid: string;
}

// UUIDs reales de agentes (media.valorant-api.com sirve los iconos por UUID)
const AGENTS: DemoAgent[] = [
  { name: 'Jett', uuid: 'add5449a-b3eb-482a-9c95-37c71a908956' },
  { name: 'Phoenix', uuid: '9f0d8ba9-4140-b941-57d3-a7ad57c6b417' },
  { name: 'Sova', uuid: '320b2a48-4d9b-a075-30f1-1f93a9b638fa' },
  { name: 'Sage', uuid: '569fdd95-4d10-43ab-ca70-906e3a10dbe2' },
  { name: 'Reyna', uuid: 'a3bfb853-43cb-4e91-a13d-2b7b12b5139d' },
];

const TEAMMATES = [
  'ShadowFox', 'KwikKill', 'MiLokO', 'DragoNite', 'PandaZzz',
  'NoScopeGod', 'LunaTic', 'RicoSuave', 'FrostByte', 'TurboPapa',
  'MidOrFeed', 'GoldenWolf', 'ZippyZap', 'ElPrimoHD', 'NekoClutch',
  'VandalKing', 'OmenMain', 'SovaDrone',
];

const MODES: Record<string, string> = {
  competitive: 'Competitivo',
  unrated: 'No clasificatorio',
  swiftplay: 'Swiftplay',
};

// LCG determinista: mismo seed => mismos datos en perfil y en scoreboard
function lcg(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface DemoMatchDef {
  mapName: string;
  mode: string;
  won: boolean;
  roundsWon: number;
  roundsLost: number;
  agentIdx: number;
  kills: number;
  deaths: number;
  assists: number;
  acs: number;
  hsPct: number;
  hoursAgo: number;
  durationMin: number;
}

const DEMO_MATCHES: DemoMatchDef[] = [
  { mapName: 'Ascent', mode: 'competitive', won: true, roundsWon: 13, roundsLost: 9, agentIdx: 0, kills: 24, deaths: 14, assists: 6, acs: 288, hsPct: 27, hoursAgo: 3, durationMin: 38 },
  { mapName: 'Bind', mode: 'competitive', won: true, roundsWon: 13, roundsLost: 11, agentIdx: 4, kills: 26, deaths: 17, assists: 4, acs: 262, hsPct: 31, hoursAgo: 27, durationMin: 43 },
  { mapName: 'Haven', mode: 'competitive', won: false, roundsWon: 9, roundsLost: 13, agentIdx: 3, kills: 15, deaths: 19, assists: 9, acs: 194, hsPct: 22, hoursAgo: 52, durationMin: 41 },
  { mapName: 'Split', mode: 'unrated', won: true, roundsWon: 13, roundsLost: 5, agentIdx: 0, kills: 22, deaths: 9, assists: 7, acs: 301, hsPct: 34, hoursAgo: 76, durationMin: 33 },
  { mapName: 'Lotus', mode: 'competitive', won: false, roundsWon: 11, roundsLost: 13, agentIdx: 1, kills: 21, deaths: 20, assists: 8, acs: 231, hsPct: 25, hoursAgo: 99, durationMin: 47 },
  { mapName: 'Sunset', mode: 'competitive', won: true, roundsWon: 13, roundsLost: 8, agentIdx: 2, kills: 18, deaths: 12, assists: 11, acs: 245, hsPct: 29, hoursAgo: 121, durationMin: 40 },
  { mapName: 'Icebox', mode: 'unrated', won: false, roundsWon: 6, roundsLost: 13, agentIdx: 4, kills: 12, deaths: 18, assists: 5, acs: 178, hsPct: 21, hoursAgo: 146, durationMin: 36 },
  { mapName: 'Ascent', mode: 'swiftplay', won: true, roundsWon: 10, roundsLost: 6, agentIdx: 0, kills: 16, deaths: 10, assists: 4, acs: 275, hsPct: 30, hoursAgo: 169, durationMin: 18 },
];

const roundsOf = (m: DemoMatchDef) => m.roundsWon + m.roundsLost;

interface GenPlayer {
  puuid: string;
  gameName: string;
  tagLine: string;
  teamId: 'Red' | 'Blue';
  agentName: string;
  agentUuid: string;
  kills: number;
  deaths: number;
  assists: number;
  acs: number;
  adr: number;
  hsPct: number;
  won: boolean;
}

function buildPlayers(matchIdx: number, def: DemoMatchDef): GenPlayer[] {
  const players: GenPlayer[] = [];
  const rand = lcg((matchIdx + 7) * 991);
  const playerTeam: 'Red' | 'Blue' = matchIdx % 2 === 0 ? 'Red' : 'Blue';
  const enemyTeam: 'Red' | 'Blue' = playerTeam === 'Red' ? 'Blue' : 'Red';

  // Demo player
  players.push({
    puuid: DEMO_PUUID,
    gameName: 'Demo',
    tagLine: 'VANTS',
    teamId: playerTeam,
    agentName: AGENTS[def.agentIdx].name,
    agentUuid: AGENTS[def.agentIdx].uuid,
    kills: def.kills,
    deaths: def.deaths,
    assists: def.assists,
    acs: def.acs,
    adr: Math.round(def.acs * 0.72 + rand() * 14),
    hsPct: def.hsPct,
    won: def.won,
  });

  const rounds = roundsOf(def);
  for (let i = 0; i < 9; i++) {
    const ally = i < 4;
    const team: 'Red' | 'Blue' = ally ? playerTeam : enemyTeam;
    const agent = AGENTS[(def.agentIdx + i + 1) % AGENTS.length];
    // Ganadores rinden mejor: sesgo según resultado del equipo
    const bias = team === (def.won ? playerTeam : enemyTeam) ? 1.18 : 0.82;
    const kills = Math.max(3, Math.round(rounds * (0.45 + rand() * 0.5) * bias));
    const deaths = Math.max(3, Math.round(rounds * (0.55 + rand() * 0.35) * (2 - bias) * 0.55));
    const assists = Math.max(0, Math.round(rounds * (0.1 + rand() * 0.35)));
    const acs = Math.round((160 + rand() * 160) * bias);
    players.push({
      puuid: `demo-puuid-${matchIdx}-${i}`,
      gameName: TEAMMATES[(matchIdx * 3 + i) % TEAMMATES.length],
      tagLine: `${['EUW', 'NA1', 'KR', 'LATAM'][i % 4]}`,
      teamId: team,
      agentName: agent.name,
      agentUuid: agent.uuid,
      kills,
      deaths,
      assists,
      acs,
      adr: Math.round(acs * 0.7 + rand() * 15),
      hsPct: Math.round(15 + rand() * 22),
      won: team === (def.won ? playerTeam : enemyTeam),
    });
  }
  return players;
}

export function demoProfile(): ProfileResponse {
  const matches: MatchSummary[] = [];
  const agentAgg = new Map<string, { uuid: string; m: number; w: number; k: number; d: number; a: number }>();

  let wins = 0, kills = 0, deaths = 0, assists = 0;
  let damage = 0, roundsTotal = 0, hs = 0, shotsTotal = 0;

  DEMO_MATCHES.forEach((def, idx) => {
    const rounds = roundsOf(def);
    const me = buildPlayers(idx, def)[0];
    roundsTotal += rounds;
    damage += Math.round(me.adr * rounds);
    hs += Math.round(me.hsPct / 100 * (me.kills * 3.2));
    shotsTotal += Math.round(me.kills * 3.2);
    if (def.won) wins++;
    kills += me.kills; deaths += me.deaths; assists += me.assists;

    const agg = agentAgg.get(me.agentName) ?? { uuid: me.agentUuid, m: 0, w: 0, k: 0, d: 0, a: 0 };
    agg.m++; if (def.won) agg.w++;
    agg.k += me.kills; agg.d += me.deaths; agg.a += me.assists;
    agentAgg.set(me.agentName, agg);

    matches.push({
      externalId: `demo-match-${idx}`,
      mapName: def.mapName,
      mode: def.mode,
      modeLabel: MODES[def.mode] ?? def.mode,
      playedAt: new Date(Date.now() - def.hoursAgo * 3600 * 1000).toISOString(),
      durationMs: def.durationMin * 60 * 1000,
      won: def.won,
      roundsWon: def.roundsWon,
      roundsLost: def.roundsLost,
      kills: me.kills,
      deaths: me.deaths,
      assists: me.assists,
      acs: me.acs,
      hsPct: me.hsPct,
      agentName: me.agentName,
      agentUuid: me.agentUuid,
    });
  });

  return {
    demo: true,
    player: { puuid: DEMO_PUUID, gameName: 'Demo', tagLine: 'VANTS', region: 'europe' },
    aggregate: {
      matches: DEMO_MATCHES.length,
      wins,
      winrate: Math.round((wins / DEMO_MATCHES.length) * 100),
      kills, deaths, assists,
      kd: Math.round((kills / deaths) * 100) / 100,
      adr: Math.round(damage / roundsTotal),
      acs: Math.round(
        DEMO_MATCHES.reduce((acc, d) => acc + d.acs * roundsOf(d), 0) / roundsTotal
      ),
      hsPct: Math.round((hs / shotsTotal) * 100),
    },
    agents: [...agentAgg.entries()].map(([name, a]) => ({
      name,
      uuid: a.uuid,
      matches: a.m,
      wins: a.w,
      kills: a.k,
      deaths: a.d,
      assists: a.a,
      kd: Math.round((a.k / a.d) * 100) / 100,
      winrate: Math.round((a.w / a.m) * 100),
    })).sort((x, y) => y.matches - x.matches),
    matches,
  };
}

export function demoMatchDetail(externalId: string): MatchDetailResponse | null {
  const idxMatch = /^demo-match-(\d+)$/.exec(externalId);
  if (!idxMatch) return null;
  const idx = Number(idxMatch[1]);
  const def = DEMO_MATCHES[idx];
  if (!def) return null;

  const rounds = roundsOf(def);
  const toTeam = (teamId: string, players: GenPlayer[]): MatchTeam => {
    const mine = players.filter((p) => p.teamId === teamId);
    const won = mine[0]?.won ?? false;
    return {
      teamId,
      won,
      roundsWon: won ? def.roundsWon : def.roundsLost,
      roundsLost: won ? def.roundsLost : def.roundsWon,
      players: mine.map((p) => ({
        puuid: p.puuid,
        gameName: p.gameName,
        tagLine: p.tagLine,
        teamId: p.teamId,
        agentName: p.agentName,
        agentUuid: p.agentUuid,
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        acs: p.acs,
        adr: p.adr,
        hsPct: p.hsPct,
        won: p.won,
      })),
    };
  };

  const players = buildPlayers(idx, def);
  const red = toTeam('Red', players);
  const blue = toTeam('Blue', players);
  // normaliza roundsWon/roundsLost por equipo (13-X para ganador)
  for (const t of [red, blue]) {
    t.roundsWon = t.won ? def.roundsWon : def.roundsLost;
    t.roundsLost = t.won ? def.roundsLost : def.roundsWon;
  }

  return {
    demo: true,
    externalId,
    mapName: def.mapName,
    modeLabel: MODES[def.mode] ?? def.mode,
    playedAt: new Date(Date.now() - def.hoursAgo * 3600 * 1000).toISOString(),
    durationMs: def.durationMin * 60 * 1000,
    teams: [red, blue].sort((a, b) => Number(b.won) - Number(a.won)),
  };
}

export const DEMO_ROUNDS_INFO = { roundsOf };
