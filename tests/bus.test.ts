// Publicación hacia VANTS-BUS: apagada sin env, firmada y enviada con env.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EVENTS, publishBusEvent } from '@/lib/bus/publish';

const URL_BUS = 'https://bus.example.workers.dev';
const SECRETO = 'secreto-de-prueba';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('publishBusEvent', () => {
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
    vi.stubEnv('VANTS_BUS_URL', URL_BUS);
    vi.stubEnv('VANTS_BUS_SECRET', SECRETO);
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
    expect(url).toBe(URL_BUS + '/events');
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
    vi.stubEnv('VANTS_BUS_URL', URL_BUS);
    vi.stubEnv('VANTS_BUS_SECRET', SECRETO);
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
