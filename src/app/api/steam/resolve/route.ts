// GET /api/steam/resolve?query=<steamid64 | steamcommunity.com/id/<vanity> | vanity>
// Primer endpoint de Steam (Fase 4 del blueprint): resuelve perfiles y biblioteca de juegos.
// La clave STEAM_API_KEY vive solo en el backend y jamás se expone al cliente.
import { NextRequest, NextResponse } from 'next/server';
import { SteamError, fetchSteamProfile, isSteamId64 } from '@/lib/steam/steam';

export async function GET(req: NextRequest) {
  const query = (req.nextUrl.searchParams.get('query') ?? '').trim();

  if (!query) {
    return NextResponse.json(
      { error: 'Falta el parámetro "query": SteamID64, URL de perfil o vanity URL (ej: gabelogannewell).' },
      { status: 400 }
    );
  }

  try {
    const result = await fetchSteamProfile(query);
    const topGames = result.games.slice(0, 10).map((g) => ({
      appid: g.appid,
      name: g.name ?? `App ${g.appid}`,
      hours: Math.round((g.playtime_forever / 60) * 10) / 10,
      hoursLast2Weeks: g.playtime_2weeks ? Math.round((g.playtime_2weeks / 60) * 10) / 10 : 0,
      lastPlayedAt: g.rtime_last_played ? new Date(g.rtime_last_played * 1000).toISOString() : null,
    }));
    return NextResponse.json({
      steamid: result.steamid,
      resolvedFrom: isSteamId64(query.trim()) ? 'steamid' : 'vanity',
      player: {
        personaname: result.player.personaname,
        realname: result.player.realname ?? null,
        profileurl: result.player.profileurl,
        avatarfull: result.player.avatarfull,
        country: result.player.loccountrycode ?? null,
        memberSince: result.player.timecreated ? new Date(result.player.timecreated * 1000).toISOString() : null,
      },
      gameCount: result.games.length,
      topGames,
    });
  } catch (err) {
    if (err instanceof SteamError) {
      const status =
        err.code === 'NOT_FOUND' ? 404
        : err.code === 'RATE_LIMIT' ? 429
        : (err.code === 'INVALID_KEY' || err.code === 'PRIVATE_PROFILE') ? 403
        : 502;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error('steam resolve error', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
