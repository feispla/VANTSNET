// GET /api/auth/discord/status — estado de configuración del enlace Discord.
import { NextResponse } from 'next/server';
import { getDiscordConfig } from '@/lib/discord';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cfg = getDiscordConfig();
  return NextResponse.json({
    configured: cfg !== null,
    redirectUriReady: Boolean(process.env.DISCORD_REDIRECT_URI?.trim() || cfg),
    // Nunca se exponen los secretos; solo su presencia.
  });
}
