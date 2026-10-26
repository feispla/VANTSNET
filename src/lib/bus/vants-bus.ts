/* ============================================================
 * VANTS-BUS · Cliente TypeScript para la API de Next.js
 * Port del contrato compartido del ecosistema (mismo contrato que
 * vants-bus/vants-bus-client.js de Vantsgames y vants-bus_client.py
 * de flask-agents). Sin dependencias externas: usa Web Crypto.
 *
 * Documentación: /conexiones-entre-repositorios de vantsgg.mintlify.site
 *
 * Configuración (opcional): si VANTS_BUS_URL o VANTS_BUS_SECRET no
 * están definidas, el bus queda apagado y el resto de la API funciona
 * igual. El secreto solo vive del lado del servidor: NUNCA lo expongas
 * en el bundle del navegador.
 * ============================================================ */

/* Contrato compartido — mantener sincronizado con el cliente de
 * Vantsgames y con flask-agents (12 tipos de evento). */
export const EVENTS = {
  TOURNAMENT_OPENED: 'tournament.inscriptions_opened',
  INSCRIPTION_CREATED: 'inscription.created',
  MATCH_FINISHED: 'match.finished',
  MATCH_SCHEDULED: 'match.scheduled',
  MATCH_CANCELED: 'match.canceled',
  CLIP_PUBLISHED: 'clip.published',
  GAME_SESSION_STARTED: 'game.session_started',
  GAME_SESSION_ENDED: 'game.session_ended',
  ANTICHEAT_PASSED: 'anticheat.passed',
  HIGHLIGHTS_READY: 'clip.highlights_ready',
  POST_GENERATED: 'post.generated',
  ALERT_DETECTED: 'alert.detected',
} as const;

export type EventType = (typeof EVENTS)[keyof typeof EVENTS];

export interface VantsBusOptions {
  busUrl: string;
  projectId: string;
  secret: string;
  fetchImpl?: typeof fetch;
}

export interface BusEvent {
  id: string;
  type: string;
  source: string;
  ts: string;
  data: Record<string, unknown>;
}

export interface FetchEventsOptions {
  since?: string;
  types?: string[] | string;
  sources?: string[] | string;
  limit?: number;
  /** Segundos de espera para long-polling (0 o ausente: respuesta inmediata). */
  wait?: number;
}

export interface FetchEventsResult {
  events?: BusEvent[];
  cursor?: string;
  hasMore?: boolean;
}

/** Error con el código HTTP de la respuesta del bus, si la hubo. */
export class VantsBusError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'VantsBusError';
    this.status = status;
  }
}

const ENC = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    ENC.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, ENC.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export class VantsBus {
  readonly busUrl: string;
  readonly projectId: string;
  private readonly secret: string;
  private readonly _fetch: typeof fetch;

  constructor({ busUrl, projectId, secret, fetchImpl }: VantsBusOptions) {
    if (!busUrl) throw new Error('VantsBus: falta busUrl');
    if (!projectId) throw new Error('VantsBus: falta projectId');
    if (!secret) throw new Error('VantsBus: falta secret');

    this.busUrl = String(busUrl).replace(/\/+$/, '');
    this.projectId = projectId;
    this.secret = secret;
    this._fetch = fetchImpl ?? globalThis.fetch;
    if (!this._fetch) throw new Error('VantsBus: fetch no disponible');
  }

  /* Firma: X-VANTS-Signature = hex(hmac_sha256(SECRET, `${ts}.${rawBody}`)).
   * En GET, rawBody es '' → se firma `${ts}.` (con el punto final). */
  private async headers(rawBody: string): Promise<Record<string, string>> {
    const ts = Math.floor(Date.now() / 1000).toString();
    const sig = await hmacHex(this.secret, `${ts}.${rawBody}`);
    return {
      'Content-Type': 'application/json',
      'X-VANTS-Project': this.projectId,
      'X-VANTS-Timestamp': ts,
      'X-VANTS-Signature': sig,
    };
  }

  private async request(
    path: string,
    { method = 'GET', body = '', query = {} }: {
      method?: 'GET' | 'POST';
      body?: string;
      query?: Record<string, string | number | undefined>;
    } = {}
  ): Promise<FetchEventsResult & Record<string, unknown>> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    }
    const q = qs.toString();
    const url = this.busUrl + path + (q ? `?${q}` : '');

    const res = await this._fetch(url, {
      method,
      headers: await this.headers(body),
      body: method === 'GET' ? undefined : body,
      signal: AbortSignal.timeout(25_000),
    });

    const text = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* respuesta no JSON */
    }

    if (!res.ok) {
      const detalle =
        json && typeof json === 'object' && 'error' in json
          ? String((json as { error: unknown }).error)
          : text.slice(0, 200);
      throw new VantsBusError(`VantsBus ${res.status}: ${detalle}`, res.status);
    }
    return (json ?? {}) as FetchEventsResult & Record<string, unknown>;
  }

  /* ---- publicar ---- */
  async publish(type: EventType | string, data: Record<string, unknown> = {}): Promise<unknown> {
    return this.request('/events', {
      method: 'POST',
      body: JSON.stringify({ type, data }),
    });
  }

  async publishBatch(events: Array<{ type: EventType | string; data?: Record<string, unknown> }>): Promise<unknown> {
    return this.request('/events', {
      method: 'POST',
      body: JSON.stringify({ events }),
    });
  }

  /* ---- consumir ---- */
  async fetchEvents(options: FetchEventsOptions = {}): Promise<FetchEventsResult> {
    const { since, types, sources, limit, wait } = options;
    return this.request('/events', {
      query: {
        since,
        types: Array.isArray(types) ? types.join(',') : types,
        sources: Array.isArray(sources) ? sources.join(',') : sources,
        limit,
        wait,
      },
    }) as Promise<FetchEventsResult>;
  }

  /* Bucle de consumo con cursor propio. Devuelve { stop() }.
   *   onEvent(ev)   → se llama por cada evento nuevo
   *   onError(err)  → fallos de red/servidor (con backoff exponencial)
   *   signal        → AbortSignal para cortar desde fuera
   *   waitSeconds>0 → long-poll (respuesta casi en tiempo real) */
  startPolling({
    types,
    sources,
    intervalMs = 30_000,
    since = '',
    onEvent,
    onError,
    signal,
    waitSeconds = 0,
  }: {
    types?: string[];
    sources?: string[];
    intervalMs?: number;
    since?: string;
    onEvent?: (ev: BusEvent) => void;
    onError?: (err: unknown) => void;
    signal?: AbortSignal;
    waitSeconds?: number;
  } = {}): { stop: () => void } {
    let cursor = since;
    let stopped = false;

    void (async () => {
      let backoff = Math.max(1000, intervalMs);
      while (!stopped) {
        try {
          const res = await this.fetchEvents({
            since: cursor,
            types,
            sources,
            limit: 100,
            wait: waitSeconds,
          });
          for (const ev of res.events ?? []) {
            cursor = ev.id;
            if (onEvent) {
              try {
                onEvent(ev);
              } catch (e) {
                if (onError) onError(e);
              }
            }
          }
          if (res.cursor) cursor = res.cursor;
          backoff = Math.max(1000, intervalMs);
        } catch (err) {
          if (onError) onError(err);
          backoff = Math.min(backoff * 2, 300_000); // backoff hasta 5 min
        }
        await new Promise((r) => setTimeout(r, waitSeconds > 0 ? 500 : backoff));
        if (signal && signal.aborted) stopped = true;
      }
    })();

    return { stop: () => { stopped = true; } };
  }
}

/* ============================================================
 * Instancia compartida de VANTSNET
 * Proyecto en el bus: "vantsnet" (cabecera X-VANTS-Project).
 * Apagada si faltan VANTS_BUS_URL o VANTS_BUS_SECRET.
 * ============================================================ */

export const VANTSNET_PROJECT_ID = 'vantsnet';

let _bus: VantsBus | null = null;

export function getBus(): VantsBus | null {
  const busUrl = process.env.VANTS_BUS_URL;
  const secret = process.env.VANTS_BUS_SECRET;
  if (!busUrl || !secret) return null;
  if (!_bus) {
    _bus = new VantsBus({ busUrl, projectId: VANTSNET_PROJECT_ID, secret });
  }
  return _bus;
}

/** Solo para pruebas: descarta la instancia en caché. */
export function resetBusForTests(): void {
  _bus = null;
}

/* Publica un evento sin bloquear la respuesta y sin romper el endpoint:
 * los errores solo se registran. Si el bus está apagado (falta URL o
 * secreto), no hace nada. */
export function publishBusEvent(type: EventType | string, data: Record<string, unknown> = {}): void {
  const bus = getBus();
  if (!bus) return;
  void bus.publish(type, data).catch((err: unknown) => {
    console.error('vants-bus-publish', {
      type,
      message: err instanceof Error ? err.message : String(err),
    });
  });
}
