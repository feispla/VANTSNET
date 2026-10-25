// Validación de entrada en las fronteras de la API (zod).
import { z } from 'zod';

export const TEAM_ROLES = ['player', 'captain', 'coach', 'substitute'] as const;
export const TOURNAMENT_FORMATS = ['single_elimination', 'double_elimination', 'round_robin'] as const;
export const TOURNAMENT_STATUSES = ['draft', 'registration', 'running', 'completed', 'cancelled'] as const;
export const REGISTRATION_ACTIONS = ['approve', 'reject'] as const;
export const MATCH_STATUSES = ['scheduled', 'live', 'completed', 'forfeit'] as const;

export const memberInput = z.object({
  nickname: z.string().trim().min(2).max(32),
  role: z.enum(TEAM_ROLES).default('player'),
});

export const teamCreateInput = z.object({
  name: z.string().trim().min(2).max(48),
  tag: z.string().trim().min(1).max(6).optional(),
  game: z.string().trim().min(2).max(32).default('valorant'),
  region: z.string().trim().max(16).optional(),
  description: z.string().trim().max(500).optional(),
  members: z.array(memberInput).max(12).optional(),
});

export const teamMemberCreateInput = memberInput;

// Las fechas del contrato (TimestamptzString) se escriben como texto ISO-8601;
// z.coerce.date() valida que el valor sea una fecha real y se normaliza a ISO.
const isoDate = () =>
  z.coerce
    .date()
    .transform((d) => d.toISOString());

export const tournamentCreateInput = z.object({
  name: z.string().trim().min(3).max(80),
  game: z.string().trim().min(2).max(32).default('valorant'),
  format: z.enum(TOURNAMENT_FORMATS).default('single_elimination'),
  maxTeams: z.number().int().min(2).max(128).default(8),
  description: z.string().trim().max(1000).optional(),
  rules: z.string().trim().max(5000).optional(),
  startsAt: isoDate().optional(),
  registrationDeadline: isoDate().optional(),
});

export const tournamentUpdateInput = z.object({
  name: z.string().trim().min(3).max(80).optional(),
  status: z.enum(TOURNAMENT_STATUSES).optional(),
  description: z.string().trim().max(1000).optional(),
  rules: z.string().trim().max(5000).optional(),
  startsAt: isoDate().nullable().optional(),
  registrationDeadline: isoDate().nullable().optional(),
});

export const registrationCreateInput = z.object({
  teamId: z.string().trim().min(1),
  notes: z.string().trim().max(300).optional(),
});

export const registrationActionInput = z.object({
  registrationId: z.string().trim().min(1),
  action: z.enum(REGISTRATION_ACTIONS),
});

export const tournamentMatchCreateInput = z.object({
  round: z.number().int().min(1).max(16).default(1),
  slot: z.string().trim().max(16).optional(),
  homeTeamId: z.string().trim().min(1).nullable().optional(),
  awayTeamId: z.string().trim().min(1).nullable().optional(),
  playedAt: isoDate().optional(),
});

export const tournamentMatchUpdateInput = z
  .object({
    matchId: z.string().trim().min(1),
    homeScore: z.number().int().min(0).max(999).optional(),
    awayScore: z.number().int().min(0).max(999).optional(),
    status: z.enum(MATCH_STATUSES).optional(),
  })
  .refine(
    (v) =>
      v.homeScore !== undefined || v.awayScore !== undefined || v.status !== undefined,
    { message: 'Debe incluir homeScore, awayScore o status.' }
  )
  .refine(
    (v) =>
      // Un resultado completado exige ambos marcadores
      v.status !== 'completed' ||
      (v.homeScore !== undefined && v.awayScore !== undefined),
    { message: 'Para completar una partida se requieren homeScore y awayScore.' }
  );

export const faceitPlayerQuery = z.object({
  nickname: z.string().trim().min(2).max(40),
});

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'torneo';
}

/** Convierte un ZodError en una respuesta plana legible en español. */
export function firstIssueMessage(err: z.ZodError): string {
  const issue = err.issues[0];
  const path = issue?.path?.length ? `${issue.path.join('.')}: ` : '';
  return `${path}${issue?.message ?? 'Entrada inválida.'}`;
}
