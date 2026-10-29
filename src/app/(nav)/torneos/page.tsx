// /torneos — Competiciones de la red, con datos VIVOS de producción (solo lectura).
// Server component con estados honestos: si la API falla o no hay torneos,
// se dice tal cual (sin brackets falsos ni datos de relleno).
import { Trophy } from 'lucide-react';
import type { Metadata } from 'next';
import { apiViva, API_VIVA_BASE, type TorneosRespuesta } from '@/lib/api-viva';
import { PanelError, PanelVacio } from '@/components/vantsnet/estados-honestos';
import { AnimAparecer } from '@/components/vantsnet/motion';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Torneos — VANTSNET',
  description: 'Torneos abiertos y en curso de la red VANTS: CS2 y VALORANT.',
};

function textoTorneo(t: Record<string, unknown>): { titulo: string; estado: string } {
  const titulo =
    (typeof t.nombre === 'string' && t.nombre) ||
    (typeof t.name === 'string' && t.name) ||
    (typeof t.titulo === 'string' && t.titulo) ||
    (typeof t.slug === 'string' && t.slug) ||
    'torneo';
  const estadoRaw = t.estado ?? t.status ?? t.state;
  const estado = typeof estadoRaw === 'string' ? estadoRaw : '';
  return { titulo, estado };
}

export default async function TorneosPage() {
  const torneos = await apiViva<TorneosRespuesta>('/api/tournaments?porPagina=24');

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Fuente: API viva de producción ({API_VIVA_BASE.replace('https://', '')}) · solo lectura
      </p>
      <h1 className="mt-1 flex items-center gap-2 text-2xl font-black tracking-tight text-white">
        <Trophy className="h-6 w-6 text-[#FF4655]" /> Torneos
      </h1>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">
        Las competiciones de VANTSNET: torneos abiertos para inscribirse, en curso y cerrados,
        con sus brackets. Datos reales de la plataforma, sin relleno.
      </p>

      <section id="activos" className="mt-8 scroll-mt-20">
        {!torneos.ok ? (
          <PanelError titulo="No se pudo consultar los torneos" motivo={torneos.motivo} />
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Torneos</h2>
              <span className="text-xs text-slate-500">
                {torneos.data.data.total} {torneos.data.data.total === 1 ? 'torneo' : 'torneos'} en total
              </span>
            </div>
            {torneos.data.data.items.length === 0 ? (
              <div className="mt-3">
                <PanelVacio
                  titulo="No hay torneos publicados todavía"
                  detalle="Cuando la organización cree un torneo (CS2 o VALORANT), aparecerá aquí con su calendario, inscripciones y bracket."
                />
              </div>
            ) : (
              <AnimAparecer>
                <ul className="mt-3 grid gap-2">
                  {torneos.data.data.items.map((t, i) => {
                  const { titulo, estado } = textoTorneo(t);
                  return (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3"
                    >
                      <span className="text-sm font-semibold text-slate-100">{titulo}</span>
                      {estado && (
                        <span className="rounded-full border border-[#FF4655]/40 bg-[#FF4655]/10 px-2.5 py-0.5 text-[11px] font-bold uppercase text-[#FF4655]">
                          {estado}
                        </span>
                      )}
                    </li>
                  );
                })}
                </ul>
              </AnimAparecer>
            )}
          </>
        )}
      </section>
    </div>
  );
}
