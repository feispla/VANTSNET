// /panel — MI PANEL: dashboard personal con datos reales de la sesión D1.
// Server component: lee la cookie firmada directamente (sin fetch a sí mismo,
// que Cloudflare no permite entre workers). Si no hay sesión → CTA honesto.
import { cookies } from 'next/headers';
import Link from 'next/link';
import {
  User,
  Link2,
  LinkIcon,
  Trophy,
  Swords,
  Shield,
  BarChart3,
  Backpack,
  CircleUser,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { Metadata } from 'next';
import { sesionDeCookies } from '@/lib/sesion';
import { d1Preview, obtenerUsuarioConIdentidades } from '@/lib/store/d1';
import { AnimAparecer } from '@/components/vantsnet/motion';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mi panel — VANTSNET',
  description: 'Tu dashboard personal en la red competitiva VANTS.',
};

const ACCESOS = [
  { href: '/play', icono: Swords, titulo: 'Play', texto: 'Centro de matchmaking' },
  { href: '/equipos', icono: Shield, titulo: 'Equipos', texto: 'Crea tu roster' },
  { href: '/torneos', icono: Trophy, titulo: 'Torneos', texto: 'Competiciones reales' },
  { href: '/rankings', icono: BarChart3, titulo: 'Rankings', texto: 'Progresión y Elo' },
  { href: '/inventario', icono: Backpack, titulo: 'Inventario', texto: 'Tu colección' },
  { href: '/sala', icono: CircleUser, titulo: 'Sala', texto: 'Roster en vivo' },
];

export default async function PanelPage() {
  // Sesión: cookie firmada → D1 preview (misma vía que /api/sesion).
  const tienda = await cookies();
  const carga = await sesionDeCookies(tienda.toString());
  let usuario: Awaited<ReturnType<typeof obtenerUsuarioConIdentidades>> | null = null;
  if (carga) {
    const db = await d1Preview();
    if (db) usuario = await obtenerUsuarioConIdentidades(db, carga.uid);
  }

  const identidades = usuario?.identidades ?? [];
  const tieneDiscord = identidades.some((i) => i.provider === 'discord');
  const tieneFaceit = identidades.some((i) => i.provider === 'faceit');

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        MI PANEL · DASHBOARD
      </p>
      <h1 className="mt-1 flex items-center gap-2 text-2xl font-black tracking-tight text-white">
        <User className="h-6 w-6 text-[#FF4655]" aria-hidden /> Mi panel
      </h1>

      {!usuario ? (
        <AnimAparecer className="mt-8">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
            <p className="text-base font-bold text-zinc-100">Conecta tu cuenta para empezar</p>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">
              Tu panel muestra la identidad competitiva real guardada en la D1 de la preview:
              tu nombre, tus cuentas vinculadas (Discord, FACEIT) y el estado de tu membresía.
              Sin sesión no hay datos que mostrar — y no inventamos ninguno.
            </p>
            <Link
              href="/api/auth/discord/start"
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#FF4655] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#ff5c68]"
            >
              <LinkIcon className="h-4 w-4" aria-hidden /> Conectar con Discord
            </Link>
          </div>
        </AnimAparecer>
      ) : (
        <AnimAparecer className="mt-8 space-y-6">
          {/* Identidad */}
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#FF4655]/30 bg-[#FF4655]/10">
                <User className="h-6 w-6 text-[#FF4655]" aria-hidden />
              </span>
              <div>
                <p className="text-lg font-black text-white">{usuario.displayName}</p>
                <p className="text-xs text-zinc-500">
                  Miembro de la red desde {new Date(usuario.createdAt).toLocaleDateString('es-ES')}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <p className="flex items-center gap-2 text-xs text-zinc-400">
                {tieneDiscord ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
                ) : (
                  <XCircle className="h-4 w-4 text-zinc-600" aria-hidden />
                )}
                Discord {tieneDiscord ? 'vinculado' : 'sin vincular'}
              </p>
              <p className="flex items-center gap-2 text-xs text-zinc-400">
                {tieneFaceit ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
                ) : (
                  <XCircle className="h-4 w-4 text-zinc-600" aria-hidden />
                )}
                FACEIT {tieneFaceit ? 'vinculado' : 'sin vincular'}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/api/auth/discord/link"
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs font-bold text-zinc-200 transition-colors hover:bg-zinc-800"
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden /> Gestionar cuentas
              </Link>
              <Link
                href="/api/auth/discord/status"
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs font-bold text-zinc-200 transition-colors hover:bg-zinc-800"
              >
                <CircleUser className="h-3.5 w-3.5" aria-hidden /> Estado de la sesión
              </Link>
            </div>
          </section>

          {/* Progreso competitivo (honesto: se construye por fases) */}
          <section className="grid gap-3 sm:grid-cols-3">
            {[
              { titulo: 'Equipo', texto: 'Fase 2 — creación de rosters' },
              { titulo: 'Ranking VANTS', texto: 'Fase 5 — temporadas y Elo' },
              { titulo: 'Insignias', texto: 'Fase 6 — motor de logros' },
            ].map((c) => (
              <div key={c.titulo} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-sm font-bold text-zinc-200">{c.titulo}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{c.texto}</p>
              </div>
            ))}
          </section>

          {/* Accesos rápidos */}
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Accesos rápidos</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {ACCESOS.map((a) => {
                const Icono = a.icono;
                return (
                  <Link
                    key={a.href}
                    href={a.href}
                    className="group rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-colors hover:border-[#FF4655]/40"
                  >
                    <Icono className="h-5 w-5 text-[#FF4655]" aria-hidden />
                    <p className="mt-2 text-sm font-bold text-zinc-100 group-hover:text-white">{a.titulo}</p>
                    <p className="text-[11px] text-zinc-500">{a.texto}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        </AnimAparecer>
      )}
    </div>
  );
}
