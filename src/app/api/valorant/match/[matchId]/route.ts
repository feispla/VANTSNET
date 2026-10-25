// GET /api/valorant/match/[matchId] — scoreboard completo de una partida
import { NextRequest, NextResponse } from 'next/server';
import { RiotError, fetchMatchReal, isRiotRegion } from '@/lib/valorant/riot';
import { demoMatchDetail } from '@/lib/valorant/demo-data';
import type { MatchDetailResponse, MatchTeam } from '@/lib/valorant/types';

const roundsFromTeams = (teams: { roundsWon: number; roundsPlayed: number }[]) => {
  // En el payload de Riot, roundsPlayed por equipo = roundsWon + roundsLost;
  // se toma el máximo por seguridad con prórrogas (OT).
  return teams.reduce((max, t) => Math.max(max, t.roundsPlayed || 0), 0);
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const region = (req.nextUrl.searchParams.get('region') ?? 'europe').toLowerCase();
  const apiKey = req.headers.get('x-riot-key')?.trim() || process.env.RIOT_API_KEY || '';

  // Demo
  if (matchId.startsWith('demo-match-')) {
    const detail = demoMatchDetail(matchId);
    if (detail) return NextResponse.json(detail);
    return NextResponse.json({ error: 'Partida demo no encontrada.' }, { status: 404 });
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Se necesita API key para consultar partidas reales.', code: 'NO_KEY' },
      { status: 400 }
    );
  }
  if (!isRiotRegion(region)) {
    return NextResponse.json({ error: 'Región inválida.' }, { status: 400 });
  }

  try {
    const m = await fetchMatchReal(matchId, region, apiKey);

    const teamsRaw = JSON.parse(m.teamsJson || '[]') as { teamId: string; won: boolean; roundsWon: number; roundsPlayed: number }[];
    const totalRounds = roundsFromTeams(teamsRaw);

    const groups = new Map<string, typeof m.players>();
    for (const p of m.players) {
      const arr = groups.get(p.teamId) ?? [];
      arr.push(p);
      groups.set(p.teamId, arr);
    }

    const teams: MatchTeam[] = [...groups.entries()].map(([teamId, players]) => {
      const tInfo = teamsRaw.find((t) => t.teamId === teamId);
      const won = tInfo?.won ?? false;
      return {
        teamId,
        won,
        roundsWon: won ? Math.max(13, Math.ceil(totalRounds / 2)) : Math.floor(totalRounds / 2),
        roundsLost: won ? Math.floor(totalRounds / 2) : Math.max(13, Math.ceil(totalRounds / 2)),
        players: players
          .map((p) => {
            const shots = p.headshots + p.bodyshots + p.legshots;
            return {
              puuid: p.puuid,
              gameName: p.gameName,
              tagLine: p.tagLine,
              teamId: p.teamId,
              agentName: p.agentName,
              agentUuid: p.agentId,
              kills: p.kills,
              deaths: p.deaths,
              assists: p.assists,
              acs: Math.round(p.scorePerRound),
              adr: totalRounds > 0 ? Math.round(p.damageMade / totalRounds) : 0,
              hsPct: shots > 0 ? Math.round((p.headshots / shots) * 100) : 0,
              won,
            };
          })
          .sort((a, b) => b.kills - a.kills || b.acs - a.acs),
      };
    });

    const detail: MatchDetailResponse = {
      demo: false,
      externalId: m.externalId,
      mapName: m.mapName,
      modeLabel: m.modeLabel,
      playedAt: m.startedAt.toISOString(),
      durationMs: m.durationMs,
      teams: teams.sort((a, b) => Number(b.won) - Number(a.won)),
    };
    return NextResponse.json(detail);
  } catch (err) {
    if (err instanceof RiotError) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        RATE_LIMIT: 429,
        INVALID_KEY: 403,
        FORBIDDEN_PRODUCT: 403,
      };
      const status = statusMap[err.code] ?? 502;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error('match error', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
