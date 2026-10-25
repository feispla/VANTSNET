// Tests de unidad de la lógica crítica (sin red ni BD).
// Ejecutar: bunx vitest run
import { describe, expect, it } from 'vitest';
import { buildState, verifyState, DiscordError } from '@/lib/discord';
import { FaceitError } from '@/lib/faceit';
import {
  slugify,
  firstIssueMessage,
  teamCreateInput,
  tournamentCreateInput,
  tournamentMatchUpdateInput,
  TOURNAMENT_STATUSES,
} from '@/lib/validators';

const SECRET = 'test-secret-para-vitest';

describe('Discord — state firmado (anti-CSRF)', () => {
  it('un state válido se verifica sin errores', () => {
    const state = buildState(SECRET);
    expect(() => verifyState(state, SECRET)).not.toThrow();
  });

  it('un state con firma alterada se rechaza como CSRF', () => {
    const state = buildState(SECRET);
    const parts = state.split('.');
    const tampered = `${parts[0]}.${parts[1]}.${Buffer.from('firma-falsa').toString('base64url')}`;
    expect(() => verifyState(tampered, SECRET)).toThrowError(DiscordError);
    try {
      verifyState(tampered, SECRET);
    } catch (err) {
      expect((err as DiscordError).code).toBe('INVALID_STATE');
      expect((err as DiscordError).status).toBe(400);
    }
  });

  it('un state con formato inválido se rechaza', () => {
    expect(() => verifyState('sin-formato', SECRET)).toThrowError(DiscordError);
  });

  it('un state firmado con otro secreto se rechaza', () => {
    const state = buildState(SECRET);
    expect(() => verifyState(state, 'otro-secreto')).toThrowError(DiscordError);
  });

  it('un state expirado se rechaza con EXPIRED_STATE', () => {
    // Simula un state emitido hace 11 minutos modificando la expiración y firmando de nuevo
    const expiry = Date.now() - 11 * 60 * 1000;
    const payload = `${expiry}.${Buffer.from('nonce').toString('base64url')}`;
    const { createHmac } = require('node:crypto') as typeof import('node:crypto');
    const sig = createHmac('sha256', SECRET).update(payload).digest('base64url');
    expect(() => verifyState(`${payload}.${sig}`, SECRET)).toThrowError(/expirado/i);
  });
});

describe('FACEIT — errores tipados', () => {
  it('FaceitError expone código y estado HTTP', () => {
    const err = new FaceitError('NOT_CONFIGURED', 'falta clave', 503);
    expect(err.code).toBe('NOT_CONFIGURED');
    expect(err.status).toBe(503);
    expect(err.message).toContain('falta clave');
  });
});

describe('Validadores — frontera de la API', () => {
  it('teamCreateInput acepta un equipo válido con miembros', () => {
    const parsed = teamCreateInput.safeParse({
      name: 'Vants Academy',
      tag: 'VNTS',
      members: [{ nickname: 'feispla', role: 'captain' }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.game).toBe('valorant'); // default aplicado
      expect(parsed.data.members?.[0].role).toBe('captain');
    }
  });

  it('teamCreateInput rechaza un rol desconocido', () => {
    const parsed = teamCreateInput.safeParse({
      name: 'Equipo',
      members: [{ nickname: 'alguien', role: 'hacker' }],
    });
    expect(parsed.success).toBe(false);
  });

  it('tournamentCreateInput aplica valores por defecto y limita maxTeams', () => {
    const ok = tournamentCreateInput.safeParse({ name: 'VANTSNET Open #1' });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.format).toBe('single_elimination');
      expect(ok.data.maxTeams).toBe(8);
    }
    const bad = tournamentCreateInput.safeParse({ name: 'Torneo', maxTeams: 1 });
    expect(bad.success).toBe(false);
  });

  it('tournamentMatchUpdateInput exige marcador completo para completar', () => {
    const incomplete = tournamentMatchUpdateInput.safeParse({ matchId: 'm1', status: 'completed' });
    expect(incomplete.success).toBe(false);

    const valid = tournamentMatchUpdateInput.safeParse({
      matchId: 'm1',
      homeScore: 13,
      awayScore: 9,
      status: 'completed',
    });
    expect(valid.success).toBe(true);

    const nothing = tournamentMatchUpdateInput.safeParse({ matchId: 'm1' });
    expect(nothing.success).toBe(false);
  });

  it('firstIssueMessage produce mensajes legibles con ruta', () => {
    const parsed = teamCreateInput.safeParse({ name: 'x' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const msg = firstIssueMessage(parsed.error);
      expect(msg.length).toBeGreaterThan(0);
      expect(msg).toMatch(/name/);
    }
  });
});

describe('slugify — slugs estables para torneos', () => {
  it('normaliza acentos, espacios y mayúsculas', () => {
    expect(slugify('VANTSNET Open #1')).toBe('vantsnet-open-1');
    expect(slugify('Copa Invierno Ñ')).toBe('copa-invierno-n');
    expect(slugify('  --Torneo--  ')).toBe('torneo');
  });

  it('no devuelve cadenas vacías', () => {
    expect(slugify('###')).toBe('torneo');
  });

  it('los estados del torneo son el conjunto esperado', () => {
    expect(TOURNAMENT_STATUSES).toEqual([
      'draft', 'registration', 'running', 'completed', 'cancelled',
    ]);
  });
});
