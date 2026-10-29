// Cliente de solo lectura contra la API web viva de producción (worker `vants`).
// REGLA VANTS PREVIEW: la preview NUNCA escribe en producción — solo GET.
//
// Transporte (en este orden):
//  1. Service binding `VANTS_API` (worker→worker, sin egress): Cloudflare
//     bloquea los fetch desde Workers hacia *.workers.dev, así que en el
//     worker de preview la vía válida es el binding de servicio.
//  2. fetch público (fallback para `next dev` local, sin bindings).

const BASE = process.env.VANTS_API_VIVA ?? 'https://vants.vants.workers.dev';

export const API_VIVA_BASE = BASE;

// Interfaz mínima de un service binding (evita depender de @cloudflare/workers-types)
interface EnlaceServicio {
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
}

export type ResultadoVivo<T> = { ok: true; data: T } | { ok: false; motivo: string };

// Resuelve el binding una sola vez por isolado (memoizado por proceso)
let enlaceMemo: EnlaceServicio | null | undefined;

async function obtenerEnlace(): Promise<EnlaceServicio | null> {
  if (enlaceMemo !== undefined) return enlaceMemo;
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const { env } = await getCloudflareContext({ async: true });
    enlaceMemo = (env as { VANTS_API?: EnlaceServicio }).VANTS_API ?? null;
  } catch {
    // Fuera del runtime de Cloudflare (next dev sin platformProxy): fallback público.
    enlaceMemo = null;
  }
  return enlaceMemo;
}

/**
 * GET read-only contra la API viva, con timeout y motivos honestos.
 * Nunca lanza: siempre devuelve ResultadoVivo para que las páginas
 * rendericen estados honestos en lugar de 500.
 */
export async function apiViva<T>(path: string): Promise<ResultadoVivo<T>> {
  const cabeceras = {
    Accept: 'application/json',
    'User-Agent': 'VANTSNET-Preview/1.0 (lectura solo)',
  };
  try {
    const enlace = await obtenerEnlace();
    const res = enlace
      ? await enlace.fetch(`https://vants.vants.workers.dev${path}`, {
          headers: cabeceras,
          signal: AbortSignal.timeout(8000),
        })
      : await fetch(`${BASE}${path}`, {
          headers: cabeceras,
          signal: AbortSignal.timeout(8000),
          cache: 'no-store',
        });
    if (!res.ok) {
      // Motivo honesto y específico: si el cuerpo trae {error: "..."} lo usamos
      // (p. ej. vitrina_no_disponible), si no, el código HTTP.
      const cuerpo = (await res.json().catch(() => null)) as { error?: unknown } | null;
      const errorApi =
        cuerpo && typeof cuerpo.error === 'string' && cuerpo.error ? cuerpo.error : `http_${res.status}`;
      return { ok: false, motivo: errorApi };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch (e) {
    const nombre = e instanceof Error ? e.name : '';
    return { ok: false, motivo: nombre === 'TimeoutError' ? 'timeout' : 'red' };
  }
}

// --- Tipos de la API viva (formas defensivas; los campos opcionales se renderizan con guardas) ---

export type JuegoVivo = {
  slug: string;
  nombre: string;
  corto: string | null;
  activo: boolean;
};

export type JugadorVivo = {
  id: string;
  display_name: string;
  role: string | null;
  rating: number | null;
  is_demo: boolean;
};

export type EnVivoRespuesta = {
  ok: boolean;
  jugadores: Array<Record<string, unknown>>;
  ahora: string;
};

export type JugadoresRespuesta = {
  ok: boolean;
  data: { pag: number; items: JugadorVivo[]; total: number };
};

export type EquiposRespuesta = {
  ok: boolean;
  data: Array<Record<string, unknown>>;
};

export type TorneosRespuesta = {
  ok: boolean;
  data: { pag: number; porPagina: number; total: number; items: Array<Record<string, unknown>> };
};

export type ClipVivo = {
  id: string;
  nick: string;
  titulo: string;
  juego: string;
  fecha: string;
  dur: number;
  tam: number;
  video: string;
  thumb: string;
};

export type ClipsRespuesta = {
  ok: boolean;
  error?: string;
  clips?: ClipVivo[];
};
