// Tests del cliente VANTS-BUS y de la publicación con identidad.
// Sin red: fetch simulado (por inyección en el cliente, por stub global
// en la capa de identidad). Ejecutar: bunx vitest run
import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  EVENTS,
  VANTSNET_PROJECT_ID,
  VantsBus,
  VantsBusError,
} from '@/lib/bus/vants-bus';
import { publishBusEvent } from '@/lib/bus/publish';

const SECRET = 'test-secret-para-vitest';
const BUS_URL = 'https://vants-bus.test.workers.dev';

type Captura = { url: string; init: RequestInit | undefined };

/** Fetch de prueba que responde OK y guarda cada petición. */
function fetchFalso(respuesta: unknown, status = 200) {
  const capturas: Captura[] = [];
  const impl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    capturas.push({ url: String(input), init });
    return new Response(JSON.stringify(respuesta), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  return { impl, capturas };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('VANTS-BUS — contrato de eventos', () => {
  it('declara exactamente los 12 tipos del contrato compartido', () => {
    expect(Object.keys(EVENTS).length).toBe(12);
    expect(EVENTS.TOURNAMENT_OPENED).toBe('tournament.inscriptions_opened');
    expect(EVENTS.INSCRIPTION_CREATED).toBe('inscription.created');
    expect(EVENTS.MATCH_FINISHED).toBe('match.finished');
    expect(EVENTS.MATCH_SCHEDULED).toBe('match.scheduled');
    expect(EVENTS.MATCH_CANCELED).toBe('match.canceled');
    expect(EVENTS.CLIP_PUBLISHED).toBe('clip.published');
    expect(EVENTS.GAME_SESSION_STARTED).toBe('game.session_started');
    expect(EVENTS.GAME_SESSION_ENDED).toBe('game.session_ended');
    expect(EVENTS.ANTICHEAT_PASSED).toBe('anticheat.passed');
    expect(EVENTS.HIGHLIGHTS_READY).toBe('clip.highlights_ready');
    expect(EVENTS.POST_GENERATED).toBe('post.generated');
    expect(EVENTS.ALERT_DETECTED).toBe('alert.detected');
  });

  it('identifica el proyecto como vantsnet', () => {
    expect(VANTSNET_PROJECT_ID).toBe('vantsnet');
  });
});

describe('VANTS-BUS — cliente', () => {
  it('valida que faltan datos de configuración', () => {
    expect(() => new VantsBus({ busUrl: '', projectId: 'vantsnet', secret: 's' })).toThrowError(/busUrl/);
    expect(() => new VantsBus({ busUrl: BUS_URL, projectId: '', secret: 's' })).toThrowError(/projectId/);
    expect(() => new VantsBus({ busUrl: BUS_URL, projectId: 'vantsnet', secret: '' })).toThrowError(/secret/);
  });

  it('publica en POST /events con las cabeceras del contrato', async () => {
    const { impl, capturas } = fetchFalso({ ok: true });
    const bus = new VantsBus({ busUrl: BUS_URL, projectId: VANTSNET_PROJECT_ID, secret: SECRET, fetchImpl: impl });
    await bus.publish(EVENTS.MATCH_FINISHED, { matchId: 'm1' });

    expect(capturas).toHaveLength(1);
    const { url, init } = capturas[0];
    expect(url).toBe(`${BUS_URL}/events`);
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({ type: 'match.finished', data: { matchId: 'm1' } }));

    const headers = new Headers(init?.headers);
    expect(headers.get('X-VANTS-Project')).toBe('vantsnet');
    const ts = headers.get('X-VANTS-Timestamp') ?? '';
    const sig = headers.get('X-VANTS-Signature') ?? '';
    expect(ts).toMatch(/^\d+$/);
    const esperada = createHmac('sha256', SECRET).update(`${ts}.${String(init?.body)}`).digest('hex');
    expect(sig).toBe(esperada);
  });

  it('firma las lecturas GET con el cuerpo vacío (punto final)', async () => {
    const { impl, capturas } = fetchFalso({ events: [], cursor: '', hasMore: false });
    const bus = new VantsBus({ busUrl: BUS_URL, projectId: VANTSNET_PROJECT_ID, secret: SECRET, fetchImpl: impl });
    await bus.fetchEvents({ since: 'evt_1', types: [EVENTS.MATCH_FINISHED], limit: 100 });

    const { url, init } = capturas[0];
    expect(url).toContain('/events?since=evt_1');
    expect(url).toContain('types=match.finished');
    expect(url).toContain('limit=100');
    expect(init?.method).toBe('GET');

    const headers = new Headers(init?.headers);
    const ts = headers.get('X-VANTS-Timestamp') ?? '';
    const esperada = createHmac('sha256', SECRET).update(`${ts}.`).digest('hex');
    expect(headers.get('X-VANTS-Signature')).toBe(esperada);
  });

  it('convierte errores HTTP en VantsBusError con su estado', async () => {
    const { impl } = fetchFalso({ error: 'firma inválida' }, 401);
    const bus = new VantsBus({ busUrl: BUS_URL, projectId: VANTSNET_PROJECT_ID, secret: SECRET, fetchImpl: impl });
    await expect(bus.publish(EVENTS.MATCH_FINISHED, {})).rejects.toThrowError(VantsBusError);
    try {
      await bus.publish(EVENTS.MATCH_FINISHED, {});
    } catch (err) {
      expect((err as VantsBusError).status).toBe(401);
    }
  });

  it('publica lotes con la clave events', async () => {
    const { impl, capturas } = fetchFalso({ ok: true });
    const bus = new VantsBus({ busUrl: BUS_URL, projectId: VANTSNET_PROJECT_ID, secret: SECRET, fetchImpl: impl });
    await bus.publishBatch([
      { type: EVENTS.MATCH_SCHEDULED, data: { matchId: 'm2' } },
      { type: EVENTS.MATCH_CANCELED, data: { matchId: 'm2' } },
    ]);
    const parsed = JSON.parse(String(capturas[0].init?.body));
    expect(Array.isArray(parsed.events)).toBe(true);
    expect(parsed.events).toHaveLength(2);
  });
});

describe('publishBusEvent — publicación con identidad vantsnet', () => {
  it('sin configuración devuelve false y no toca la red', async () => {
    vi.stubEnv('VANTS_BUS_URL', '');
    vi.stubEnv('VANTS_BUS_SECRET', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const publicado = await publishBusEvent(EVENTS.INSCRIPTION_CREATED, {
      tournamentId: 'copa-vants',
      teamId: 'team_1',
      game: 'valorant',
    });

    expect(publicado).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('con configuración firma la petición y publica el evento', async () => {
    vi.stubEnv('VANTS_BUS_URL', BUS_URL);
    vi.stubEnv('VANTS_BUS_SECRET', SECRET);
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => ({
      ok: true,
      text: async () => '{"ok":true}',
    }));
    vi.stubGlobal('fetch', fetchMock);

    const publicado = await publishBusEvent(EVENTS.MATCH_FINISHED, {
      matchId: 'm1',
      game: 'valorant',
      a: 'ALPHA',
      b: 'BETA',
      sa: 13,
      sb: 9,
      finishedAt: '2026-10-26T00:00:00.000Z',
    });

    expect(publicado).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(BUS_URL + '/events');
    expect(init.method).toBe('POST');

    const cabeceras = init.headers as Record<string, string>;
    expect(cabeceras['X-VANTS-Project']).toBe('vantsnet');
    expect(cabeceras['X-VANTS-Timestamp']).toMatch(/^\d+$/);
    expect(cabeceras['X-VANTS-Signature']).toMatch(/^[0-9a-f]{64}$/);

    const cuerpo = JSON.parse(String(init.body)) as {
      type: string;
      data: Record<string, unknown>;
    };
    expect(cuerpo.type).toBe('match.finished');
    expect(cuerpo.data.a).toBe('ALPHA');
    expect(cuerpo.data.sb).toBe(9);
  });

  it('un fallo del bus devuelve false en vez de romper al emisor', async () => {
    vi.stubEnv('VANTS_BUS_URL', BUS_URL);
    vi.stubEnv('VANTS_BUS_SECRET', SECRET);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 500,
        text: async () => '{"error":"boom"}',
      }))
    );

    const publicado = await publishBusEvent(EVENTS.MATCH_SCHEDULED, {
      matchId: 'm2',
      game: 'valorant',
      startsAt: '2026-11-01T18:00:00.000Z',
    });

    expect(publicado).toBe(false);
  });
});
