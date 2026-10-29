// /sala — La Sala: centro de mando con datos VIVOS de producción (solo lectura).
// Server component: consulta la API viva del worker `vants` y renderiza
// estados honestos si algo falla o viene vacío. Sin caché: es una sala en vivo.
import { Gamepad2, Radio, Shield, Users } from 'lucide-react';
import type { Metadata } from 'next';
import {
  apiViva,
  API_VIVA_BASE,
  type EnVivoRespuesta,
  type EquiposRespuesta,
  type JuegoVivo,
  type JugadoresRespuesta,
} from '@/lib/api-viva';
import { PanelError, PanelVacio } from '@/components/vantsnet/estados-honestos';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sala — VANTSNET',
  description: 'Quién está en vivo ahora, jugadores con rating VANTS y equipos de la red.',
};

function nombreJugadorEnVivo(j: Record<string, unknown>): string {
  const v = j.display_name ?? j.nombre ?? j.nick ?? j.id;
  return typeof v === 'string' ? v : 'jugador';
}

export default async function SalaPage() {
  const [enVivo, jugadores, equipos, juegos] = await Promise.all([
    apiViva<EnVivoRespuesta>('/api/en-vivo'),
    apiViva<JugadoresRespuesta>('/api/players?porPagina=50'),
    apiViva<EquiposRespuesta>('/api/teams'),
    apiViva<{ ok: boolean; data: JuegoVivo[] }>('/api/games'),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Fuente: API viva de producción ({API_VIVA_BASE.replace('https://', '')}) · solo lectura
      </p>
      <h1 className="mt-1 text-2xl font-black tracking-tight text-white">
        La <span className="text-[#FF4655]">Sala</span>
      </h1>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">
        El centro de mando de VANTSNET: actividad en directo, roster de jugadores y equipos de la
        red. Todos los datos vienen de la plataforma real, sin simulaciones.
      </p>

      {/* En vivo */}
      <section id="envivo" className="mt-8 scroll-mt-20">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-300">
          <Radio className="h-4 w-4 text-[#FF4655]" /> En vivo ahora
        </h2>
        <div className="mt-3">
          {!enVivo.ok ? (
            <PanelError titulo="No se pudo consultar la actividad en vivo" motivo={enVivo.motivo} />
          ) : enVivo.data.jugadores.length === 0 ? (
            <PanelVacio
              titulo="Nadie está en vivo ahora mismo"
              detalle="Cuando un jugador entre en partida y la publique al BUS, aparecerá aquí al instante."
            />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {enVivo.data.jugadores.map((j, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-200"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  {nombreJugadorEnVivo(j)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Jugadores */}
      <section id="jugadores" className="mt-8 scroll-mt-20">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-300">
          <Users className="h-4 w-4 text-[#FF4655]" /> Jugadores
        </h2>
        <div className="mt-3">
          {!jugadores.ok ? (
            <PanelError titulo="No se pudo consultar el roster" motivo={jugadores.motivo} />
          ) : jugadores.data.data.items.length === 0 ? (
            <PanelVacio
              titulo="Aún no hay jugadores registrados"
              detalle="El roster se llena cuando las cuentas se vinculan desde el perfil."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Jugador</th>
                    <th className="px-4 py-2 font-semibold">Rol</th>
                    <th className="px-4 py-2 text-right font-semibold">Rating VANTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {jugadores.data.data.items.map((p) => (
                    <tr key={p.id} className="bg-slate-900/40">
                      <td className="px-4 py-2.5 font-semibold text-slate-100">
                        {p.display_name}
                        {p.is_demo && (
                          <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-400">
                            demo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">{p.role ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[#FF4655]">
                        {p.rating != null ? p.rating.toFixed(3) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Equipos */}
      <section id="equipos" className="mt-8 scroll-mt-20">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-300">
          <Shield className="h-4 w-4 text-[#FF4655]" /> Equipos
        </h2>
        <div className="mt-3">
          {!equipos.ok ? (
            <PanelError titulo="No se pudo consultar los equipos" motivo={equipos.motivo} />
          ) : equipos.data.data.length === 0 ? (
            <PanelVacio
              titulo="Aún no hay equipos registrados"
              detalle="Los equipos aparecerán cuando se creen desde la plataforma (roster, tag y juego)."
            />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {equipos.data.data.map((e, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-200"
                >
                  {String(e.nombre ?? e.name ?? e.id ?? 'equipo')}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Juegos activos */}
      <section id="juegos" className="mt-8 scroll-mt-20">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-300">
          <Gamepad2 className="h-4 w-4 text-[#FF4655]" /> Juegos de la red
        </h2>
        <div className="mt-3">
          {!juegos.ok ? (
            <PanelError titulo="No se pudo consultar los juegos" motivo={juegos.motivo} />
          ) : juegos.data.data.length === 0 ? (
            <PanelVacio titulo="Sin juegos configurados" detalle="La plataforma aún no tiene juegos activos." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {juegos.data.data.map((g) => (
                <span
                  key={g.slug}
                  className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs font-bold text-slate-200"
                >
                  {g.nombre}
                  {!g.activo && <span className="ml-1.5 text-[10px] text-slate-500">(inactivo)</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
