// /clips — Vitrina de clips de la comunidad (solo lectura).
// Hoy la API viva responde vitrina_no_disponible: la página lo declara
// honestamente y explica qué falta, en vez de mostrar tarjetas inventadas.
import { Clapperboard } from 'lucide-react';
import type { Metadata } from 'next';
import { apiViva, API_VIVA_BASE, type ClipsRespuesta } from '@/lib/api-viva';
import { PanelError, PanelVacio } from '@/components/vantsnet/estados-honestos';
import { AnimAparecer } from '@/components/vantsnet/motion';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Clips — VANTSNET',
  description: 'Las mejores jugadas de la comunidad VANTS: vitrina de clips destacados.',
};

export default async function ClipsPage() {
  const clips = await apiViva<ClipsRespuesta>('/api/clips/featured');

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Fuente: API viva de producción ({API_VIVA_BASE.replace('https://', '')}) · solo lectura
      </p>
      <h1 className="mt-1 flex items-center gap-2 text-2xl font-black tracking-tight text-white">
        <Clapperboard className="h-6 w-6 text-[#FF4655]" /> Clips
      </h1>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">
        La vitrina de VANTSNET: las mejores jugadas de la comunidad, seleccionadas y votadas.
        Sin clips, la vitrina se muestra vacía — nunca con relleno.
      </p>

      <section id="destacados" className="mt-8 scroll-mt-20">
        {!clips.ok ? (
          clips.motivo === 'vitrina_no_disponible' ? (
            <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-6 text-center">
              <Clapperboard className="mx-auto h-6 w-6 text-amber-500" aria-hidden />
              <p className="mt-2 text-sm font-semibold text-amber-200">
                La vitrina de clips todavía no está disponible
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-amber-300/80">
                La API viva responde{' '}
                <code className="rounded bg-amber-950/60 px-1 py-0.5 font-mono text-[11px]">
                  vitrina_no_disponible
                </code>
                : el worker de producción no pudo leer el manifest de clips (releases de GitHub)
                cuando se le consultó. Cuando vuelva a responder, los clips aparecerán aquí solos.
              </p>
            </div>
          ) : (
            <PanelError titulo="No se pudo consultar la vitrina de clips" motivo={clips.motivo} />
          )
        ) : !clips.data.clips || clips.data.clips.length === 0 ? (
          <PanelVacio
            titulo="La vitrina está vacía esta semana"
            detalle="No hay clips destacados publicados ahora mismo. Vuelve pronto."
          />
        ) : (
          <AnimAparecer>
            <ul className="grid gap-3 sm:grid-cols-2">
            {clips.data.clips.map((c) => (
              <li
                key={c.id}
                className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60"
              >
                <a
                  href={c.video}
                  target="_blank"
                  rel="noreferrer"
                  className="block transition-colors hover:bg-slate-800/50"
                >
                  <div className="flex items-center justify-between gap-2 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-100">{c.titulo}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {c.nick} · {c.juego} ·{' '}
                        {new Date(c.fecha).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                        })}
                        {c.dur ? ` · ${Math.round(c.dur)}s` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-[#FF4655]/40 bg-[#FF4655]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#FF4655]">
                      ver
                    </span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
          </AnimAparecer>
        )}
      </section>
    </div>
  );
}
