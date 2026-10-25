// GET /api/valorant/profile?riotId=Nombre#TAG&region=europe
// Sin API key -> solo funciona el jugador demo (Demo#VANTS)
import { NextRequest, NextResponse } from 'next/server';
import {
  RiotError, fetchProfileReal, isRiotRegion,
} from '@/lib/valorant/riot';
import { DEMO_RIOT_ID, demoProfile } from '@/lib/valorant/demo-data';

export async function GET(req: NextRequest) {
  const riotId = (req.nextUrl.searchParams.get('riotId') ?? '').trim();
  const region = (req.nextUrl.searchParams.get('region') ?? 'europe').toLowerCase();
  const apiKey = req.headers.get('x-riot-key')?.trim() || process.env.RIOT_API_KEY || '';

  if (!riotId || !riotId.includes('#')) {
    return NextResponse.json(
      { error: 'Formato inválido. Usa Nombre#TAG (ej: Demo#VANTS).' },
      { status: 400 }
    );
  }

  // El jugador demo SIEMPRE sirve datos simulados (no existe en la API real),
  // haya o no API key configurada en el backend.
  if (riotId.toLowerCase() === DEMO_RIOT_ID) {
    return NextResponse.json(demoProfile());
  }

  // Modo demo: sin API key solo se puede ver el jugador demo
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'Sin API key de Riot solo está disponible el jugador demo "Demo#VANTS". Añade tu clave de developer para buscar jugadores reales.',
        code: 'NO_KEY',
      },
      { status: 400 }
    );
  }

  if (!isRiotRegion(region)) {
    return NextResponse.json({ error: 'Región inválida.' }, { status: 400 });
  }

  try {
    const profile = await fetchProfileReal(riotId, region, apiKey);
    return NextResponse.json(profile);
  } catch (err) {
    if (err instanceof RiotError) {
      const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'RATE_LIMIT' ? 429 : (err.code === 'INVALID_KEY' || err.code === 'FORBIDDEN_PRODUCT') ? 403 : 502;
      const body: Record<string, unknown> = { error: err.message, code: err.code };
      if (err.account) {
        body.verifiedAccount = err.account;
        body.error = `${err.message} (Cuenta verificada en tiempo real por la API de Riot: ${err.account.gameName}#${err.account.tagLine})`;
      }
      return NextResponse.json(body, { status });
    }
    console.error('profile error', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
