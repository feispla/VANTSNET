// IA FACTORY · lectura REAL del cuartel flask-Agents y de VANTS-BUS.
// REGLAS del plan VANTS PREVIEW:
//  - Solo lectura: nada de comandos POST al cuartel ni escrituras al bus.
//  - Cuartel: web pública https://vants-ai.vercel.app (endpoints /healthz,
//    /api/agentes, /api/ia). No se duplica nada del cuartel ni se acopla a
//    su memoria (Neon): se consume su API como cualquier integrante.
//  - Bus: el cliente existente (src/lib/bus/vants-bus.ts) firma HMAC y ya
//    acepta fetchImpl. Si el worker preview tiene VANTS_BUS_URL+SECRET,
//    se lee por el service binding VANTS_BUS (CF bloquea Worker→workers.dev);
//    sin credenciales, la fábrica lo declara honestamente y sigue funcionando.

import { VantsBus, VANTSNET_PROJECT_ID, VantsBusError } from '@/lib/bus/vants-bus';
import { envCf, type EnlaceServicio } from './cf-env';

const CUARTEL = process.env.CUARTEL_URL ?? 'https://vants-ai.vercel.app';

export const CUARTEL_BASE = CUARTEL;

export type ResultadoVivo<T> = { ok: true; data: T } | { ok: false; motivo: string };

/** GET JSON genérico con timeout y motivos honestos (nunca lanza). */
async function getJson<T>(url: string): Promise<ResultadoVivo<T>> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'VANTSNET-Preview/1.0 (ia-factory)' },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (!res.ok) {
      const cuerpo = (await res.json().catch(() => null)) as { error?: unknown } | null;
      const errorApi =
        cuerpo && typeof cuerpo.error === 'string' && cuerpo.error
          ? cuerpo.error
          : `http_${res.status}`;
      return { ok: false, motivo: errorApi };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch (e) {
    const nombre = e instanceof Error ? e.name : '';
    return { ok: false, motivo: nombre === 'TimeoutError' ? 'timeout' : 'red' };
  }
}

// ---------- Cuartel ----------

export type SaludCuartel = { ok: boolean; servicio?: string };

export type CapacidadAgente = { k: string; v: string };

export type AgenteCuartel = {
  id: string;
  nombre: string;
  chip?: string;
  color?: string;
  estado?: string;
  rol?: string;
  resumen?: string;
  donde?: string;
  lenguaje?: string;
  que_hace?: string[];
  capacidades?: CapacidadAgente[];
  envs?: string[];
};

export type EstadoIA = {
  ok?: boolean;
  activo?: boolean;
  modelo?: string;
  proveedor?: string;
  fallback?: string;
};

export const cuartelSalud = () => getJson<SaludCuartel>(`${CUARTEL}/healthz`);
export const cuartelAgentes = () => getJson<{ agentes: AgenteCuartel[] }>(`${CUARTEL}/api/agentes`);
export const cuartelIA = () => getJson<EstadoIA>(`${CUARTEL}/api/ia`);

// ---------- VANTS-BUS ----------

export type EventoBus = {
  id: string;
  type: string;
  source: string;
  ts: string;
  data: Record<string, unknown>;
};

export type EstadoBus =
  | { modo: 'sin_credenciales'; detalle: string }
  | { modo: 'secreto_invalido'; detalle: string }
  | { modo: 'error'; motivo: string }
  | { modo: 'activo'; eventos: EventoBus[]; cursor?: string };

export async function busEstado(limite = 10): Promise<EstadoBus> {
  const env = await envCf();
  const url = (env?.VANTS_BUS_URL as string | undefined) ?? process.env.VANTS_BUS_URL;
  const secret = (env?.VANTS_BUS_SECRET as string | undefined) ?? process.env.VANTS_BUS_SECRET;
  if (!url || !secret) {
    return {
      modo: 'sin_credenciales',
      detalle:
        'El worker de preview no tiene VANTS_BUS_URL y VANTS_BUS_SECRET. Instálalos (wrangler secret put) y los eventos aparecerán aquí sin cambiar código: el cliente de lectura ya está cableado.',
    };
  }
  const enlace = env?.VANTS_BUS as EnlaceServicio | undefined;
  const fetchImpl: typeof fetch | undefined = enlace
    ? ((input: RequestInfo | URL, init?: RequestInit) =>
        enlace.fetch(input instanceof URL ? input.toString() : String(input), init)) as typeof fetch
    : undefined;
  try {
    const cli = new VantsBus({ busUrl: url, projectId: VANTSNET_PROJECT_ID, secret, fetchImpl });
    const r = await cli.fetchEvents({ limit: limite });
    return { modo: 'activo', eventos: (r.events ?? []) as EventoBus[], cursor: r.cursor };
  } catch (e) {
    if (e instanceof VantsBusError && (e.status === 401 || e.status === 403)) {
      return {
        modo: 'secreto_invalido',
        detalle:
          'El BUS rechazó la firma HMAC del preview (credenciales con otro secreto o proyecto no registrado). Revisa VANTS_BUS_SECRET y el projectId vantsnet.',
      };
    }
    return {
      modo: 'error',
      motivo: e instanceof Error ? (e.name === 'TimeoutError' ? 'timeout' : e.message) : 'red',
    };
  }
}
