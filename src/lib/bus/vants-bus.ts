/* ============================================================
 * VANTS-BUS · Cliente TypeScript de VANTSNET
 * Puerto del cliente compartido del ecosistema (vants-bus-client.js
 * de Playvants-web / vants-faceit-webhook / vants-dev-launcher).
 * Solo servidor: el secreto NUNCA llega al navegador.
 *
 * Publica los eventos del prototipo (torneos, inscripciones y
 * resultados de partidas) al bus del ecosistema. Sin configuración
 * (VANTS_BUS_URL + VANTS_BUS_SECRET) el bus queda apagado y el
 * resto de la aplicación funciona igual.
 * ============================================================ */

const ENC = new TextEncoder();

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

export type BusEventType = (typeof EVENTS)[keyof typeof EVENTS];

export class VantsBusError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'VantsBusError';
    this.status = status;
  }
}

export interface VantsBusOptions {
  busUrl: string;
  projectId: string;
  secret: string;
  fetchImpl?: typeof fetch;
}

export interface FetchEventsOptions {
  since?: string;
  types?: string | string[];
  sources?: string | string[];
  limit?: number;
  wait?: number;
}

export interface BusEvent {
  id: string;
  type: string;
  source: string;
  ts: string;
  data: Record<string, unknown>;
}

interface FetchEventsResponse {
  events?: BusEvent[];
  cursor?: string;
  hasMore?: boolean;
}

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
  private busUrl: string;
  private projectId: string;
  private secret: string;
  private fetchImpl?: typeof fetch;

  constructor({ busUrl, projectId, secret, fetchImpl }: VantsBusOptions) {
    if (!busUrl) throw new Error('VantsBus: falta busUrl');
    if (!projectId) throw new Error('VantsBus: falta projectId');
    if (!secret) throw new Error('VantsBus: falta secret');

    this.busUrl = String(busUrl).replace(/\/+$/, '');
    this.projectId = projectId;
    this.secret = secret;
    this.fetchImpl = fetchImpl;
  }

  /* Firma: X-VANTS-Signature = hex(hmac_sha256(SECRET, `${ts}.${rawBody}`)).
   * En GET, rawBody es '' → se firma `${ts}.` (con el punto final). */
  private async headers(rawBody: string): Promise<Record<string, string>> {
    const ts = Math.floor(Date.now() / 1000).toString();
    const sig = await hmacHex(this.secret, ts + '.' + rawBody);
    return {
      'Content-Type': 'application/json',
      'X-VANTS-Project': this.projectId,
      'X-VANTS-Timestamp': ts,
      'X-VANTS-Signature': sig,
    };
  }

  private async request(
    path: string,
    {
      method = 'GET',
      body = '',
      query = {},
    }: {
      method?: string;
      body?: string;
      query?: Record<string, string | number | undefined>;
    } = {}
  ): Promise<unknown> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    }
    const q = qs.toString();
    const url = this.busUrl + path + (q ? '?' + q : '');

    // Se resuelve en cada llamada: en tests permite stubs del fetch global
    // y en runtime recoge siempre el fetch del entorno actual.
    const impl = this.fetchImpl || globalThis.fetch;
    if (!impl) throw new Error('VantsBus: fetch no disponible');

    const res = await impl(url, {
      method,
      headers: await this.headers(body),
      body: method === 'GET' ? undefined : body,
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
    return json;
  }

  /* ---- publicar ---- */
  async publish(type: BusEventType, data: Record<string, unknown> = {}): Promise<unknown> {
    return this.request('/events', {
      method: 'POST',
      body: JSON.stringify({ type, data }),
    });
  }

  async publishBatch(
    events: { type: BusEventType; data: Record<string, unknown> }[]
  ): Promise<unknown> {
    return this.request('/events', {
      method: 'POST',
      body: JSON.stringify({ events }),
    });
  }

  /* ---- consumir ---- */
  async fetchEvents({
    since,
    types,
    sources,
    limit,
    wait,
  }: FetchEventsOptions = {}): Promise<FetchEventsResponse> {
    return (await this.request('/events', {
      query: {
        since,
        types: Array.isArray(types) ? types.join(',') : types,
        sources: Array.isArray(sources) ? sources.join(',') : sources,
        limit,
        wait,
      },
    })) as FetchEventsResponse;
  }
}

export default VantsBus;
