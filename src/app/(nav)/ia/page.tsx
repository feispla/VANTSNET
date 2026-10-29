// /ia — IA FACTORY: taller de inteligencia de VANTSNET.
// Lectura REAL y solo-lectura del cuartel flask-Agents (vants-ai.vercel.app)
// y del pulso de VANTS-BUS. Nada simulado: cada tarjeta viene de su fuente,
// y lo que falta se declara tal cual (estados honestos).
import { Bot, Activity, Zap, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import {
  CUARTEL_BASE,
  busEstado,
  cuartelAgentes,
  cuartelIA,
  cuartelSalud,
  type AgenteCuartel,
} from '@/lib/iafactory';
import { PanelError, PanelVacio } from '@/components/vantsnet/estados-honestos';
import { AnimAparecer } from '@/components/vantsnet/motion';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'IA Factory — VANTSNET',
  description: 'El taller de inteligencia de VANTS: agentes del cuartel y pulso de VANTS-BUS, en lectura real.',
};

function ChipEstado({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase ${
        ok
          ? 'border-emerald-700/60 bg-emerald-900/30 text-emerald-300'
          : 'border-rose-800/60 bg-rose-950/40 text-rose-300'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-rose-400'}`} />
      {texto}
    </span>
  );
}

function TarjetaAgente({ a }: { a: AgenteCuartel }) {
  const activo = (a.estado ?? '').toLowerCase() === 'activo';
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-100">
            <Bot className="h-4 w-4 shrink-0" style={{ color: a.color ?? '#FF4655' }} />
            {a.nombre}
          </h3>
          {a.rol && <p className="mt-0.5 text-[11px] text-slate-500">{a.rol}</p>}
        </div>
        <ChipEstado ok={activo} texto={a.estado ?? 'desconocido'} />
      </div>
      {a.resumen && (
        <p className="mt-2 text-xs leading-relaxed text-slate-400">{a.resumen}</p>
      )}
      {a.capacidades && a.capacidades.length > 0 && (
        <dl className="mt-3 space-y-1.5 border-t border-slate-800 pt-3">
          {a.capacidades.map((c) => (
            <div key={c.k} className="grid grid-cols-[86px_1fr] gap-2 text-[11px]">
              <dt className="font-bold uppercase tracking-wide text-slate-500">{c.k}</dt>
              <dd className="leading-relaxed text-slate-300">{c.v}</dd>
            </div>
          ))}
        </dl>
      )}
      {a.donde && (
        <p className="mt-3 truncate text-[10px] text-slate-600" title={a.donde}>
          {a.donde}
        </p>
      )}
    </article>
  );
}

export default async function IaPage() {
  const [salud, agentes, ia, bus] = await Promise.all([
    cuartelSalud(),
    cuartelAgentes(),
    cuartelIA(),
    busEstado(10),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Fuente: cuartel ({CUARTEL_BASE.replace('https://', '')}) + VANTS-BUS · lectura real, solo lectura
      </p>
      <h1 className="mt-1 flex items-center gap-2 text-2xl font-black tracking-tight text-white">
        <Zap className="h-6 w-6 text-[#FF4655]" /> IA Factory
      </h1>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">
        El taller de inteligencia de VANTSNET: quiénes son los agentes del cuartel, cómo está el
        cerebro y qué pulsa por el BUS. Todo leído en vivo de sus fuentes reales — sin copias ni
        simulaciones.
      </p>

      {/* Estado del cuartel */}
      <section id="cuartel" className="mt-8 scroll-mt-20">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-300">
          <ShieldCheck className="h-4 w-4 text-[#FF4655]" /> Cuartel flask-Agents
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {salud.ok ? (
            <>
              <ChipEstado ok={salud.data.ok !== false} texto={salud.data.servicio ?? 'cuartel OK'} />
              {ia.ok && (
                <ChipEstado
                  ok={ia.data.activo === true}
                  texto={
                    ia.data.activo
                      ? `cerebro activo · ${ia.data.modelo ?? 'LLM'}`
                      : `fallback · ${ia.data.fallback ?? 'reglas'}`
                  }
                />
              )}
            </>
          ) : (
            <PanelError titulo="No se pudo consultar la salud del cuartel" motivo={salud.motivo} />
          )}
        </div>
        {ia.ok && ia.data.proveedor && (
          <p className="mt-2 text-[11px] text-slate-600">
            Proveedor del cerebro: <span className="font-mono">{ia.data.proveedor}</span>
            {ia.data.fallback ? ` · fallback: ${ia.data.fallback}` : ''}
          </p>
        )}
      </section>

      {/* Agentes */}
      <section id="agentes" className="mt-6 scroll-mt-20">
        {!agentes.ok ? (
          <PanelError titulo="No se pudo consultar el squad de agentes" motivo={agentes.motivo} />
        ) : agentes.data.agentes.length === 0 ? (
          <PanelVacio
            titulo="El cuartel no reporta agentes"
            detalle="La API /api/agentes respondió sin agentes. Si el cuartel está desplegando, puede tardar unos minutos."
          />
        ) : (
          <AnimAparecer>
            <div className="grid gap-3 sm:grid-cols-2">
              {agentes.data.agentes.map((a) => (
                <TarjetaAgente key={a.id} a={a} />
              ))}
            </div>
          </AnimAparecer>
        )}
      </section>

      {/* Pulso del BUS */}
      <section id="bus" className="mt-8 scroll-mt-20">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-300">
          <Activity className="h-4 w-4 text-[#FF4655]" /> Pulso de VANTS-BUS
        </h2>
        <div className="mt-3">
          {bus.modo === 'sin_credenciales' ? (
            <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-6 text-center">
              <Activity className="mx-auto h-6 w-6 text-amber-500" aria-hidden />
              <p className="mt-2 text-sm font-semibold text-amber-200">
                BUS sin credenciales en la preview
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-amber-300/80">
                {bus.detalle}
              </p>
            </div>
          ) : bus.modo === 'secreto_invalido' ? (
            <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-6 text-center">
              <p className="mt-2 text-sm font-semibold text-amber-200">El BUS rechazó la firma</p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-amber-300/80">
                {bus.detalle}
              </p>
            </div>
          ) : bus.modo === 'error' ? (
            <PanelError titulo="No se pudo consultar el BUS" motivo={bus.motivo} />
          ) : bus.eventos.length === 0 ? (
            <PanelVacio
              titulo="Sin eventos recientes en el BUS"
              detalle="El BUS está conectado y respondió, pero no hay eventos en este momento. Cuando la plataforma publique (partidas, torneos, clips), aparecerán aquí."
            />
          ) : (
            <AnimAparecer>
              <ul className="space-y-2">
              {bus.eventos.map((ev) => (
                <li
                  key={ev.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded bg-[#FF4655]/10 px-2 py-0.5 font-mono text-[11px] font-bold text-[#FF4655]">
                      {ev.type}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-600">
                      {ev.source} · {new Date(ev.ts).toLocaleString('es-ES')}
                    </span>
                  </div>
                  <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap break-all text-[11px] leading-relaxed text-slate-500">
                    {JSON.stringify(ev.data)}
                  </pre>
                </li>
              ))}
              </ul>
            </AnimAparecer>
          )}
        </div>
      </section>
    </div>
  );
}
