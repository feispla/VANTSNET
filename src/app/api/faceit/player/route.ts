// GET /api/faceit/player?nickname=X — jugador FACEIT + historial reciente.
// Estado honesto si FACEIT_API_KEY no está configurada (503).
import { NextRequest, NextResponse } from 'next/server';
import {
  FaceitError,
  fetchFaceitHistory,
  fetchFaceitPlayer,
} from '@/lib/faceit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const nickname = req.nextUrl.searchParams.get('nickname')?.trim() ?? '';
  if (nickname.length < 2) {
    return NextResponse.json(
      { error: 'Indica un nickname de FACEIT (mínimo 2 caracteres).', code: 'BAD_INPUT' },
      { status: 400 }
    );
  }

  try {
    const player = await fetchFaceitPlayer(nickname);
    let history: Awaited<ReturnType<typeof fetchFaceitHistory>> = [];
    try {
      history = await fetchFaceitHistory(player.playerId, 5);
    } catch {
      // El historial es complementario: si falla, el perfil sigue siendo válido
      history = [];
    }
    return NextResponse.json({
      provider: 'faceit',
      player,
      history,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof FaceitError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.code === 'NOT_CONFIGURED' ? 503 : err.status }
      );
    }
    console.error('faceit-player', err);
    return NextResponse.json({ error: 'Error interno consultando FACEIT.' }, { status: 500 });
  }
}
