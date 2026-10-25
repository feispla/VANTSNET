#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/31103b78e5ac4e75955794c6a091d9e3d88d07747c9f0ca991f1134fcf05464f/contract';
import endContract from '../../snapshots/31103b78e5ac4e75955794c6a091d9e3d88d07747c9f0ca991f1134fcf05464f/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'AuditLog',
        columns: [
          col('action', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('actor', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('detailJson', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('entity', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('entityId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Match',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('durationMs', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('externalId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('game', 'text', {
            notNull: true,
            default: lit('valorant'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('mapId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('mapName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('mode', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('modeLabel', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('raw', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('roundsPlayed', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('startedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('teamsJson', 'text', {
            notNull: true,
            default: lit('[]'),
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'MatchPlayerStat',
        columns: [
          col('agentId', 'text', {
            notNull: true,
            default: lit(''),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('agentName', 'text', {
            notNull: true,
            default: lit(''),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('assists', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('bodyshots', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('damageMade', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('damageReceived', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('deaths', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('gameName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('headshots', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kills', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('legshots', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('matchId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('puuid', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('roundsPlayed', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('score', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('scorePerRound', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('tagLine', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('teamId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('won', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Player',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('game', 'text', {
            notNull: true,
            default: lit('valorant'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('gameName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastFetchedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('puuid', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('region', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tagLine', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ProviderIdentity',
        columns: [
          col('avatarUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('displayName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastSyncAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('provider', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('providerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('rawJson', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Team',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('game', 'text', {
            notNull: true,
            default: lit('valorant'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('logoUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('region', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tag', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'TeamMember',
        columns: [
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('joinedAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('nickname', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', {
            notNull: true,
            default: lit('player'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('teamId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Tournament',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('format', 'text', {
            notNull: true,
            default: lit('single_elimination'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('game', 'text', {
            notNull: true,
            default: lit('valorant'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('maxTeams', 'int4', {
            notNull: true,
            default: lit(8),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('registrationDeadline', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('rules', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('startsAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('draft'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'TournamentMatch',
        columns: [
          col('awayScore', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('awayTeamId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('externalMatchRef', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('homeScore', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('homeTeamId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('playedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('round', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('slot', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('scheduled'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tournamentId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'TournamentRegistration',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('registeredById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('pending'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('teamId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tournamentId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'User',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('displayName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Match',
        constraint: 'Match_externalId_key',
        columns: ['externalId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Player',
        constraint: 'Player_puuid_key',
        columns: ['puuid'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ProviderIdentity',
        constraint: 'ProviderIdentity_provider_providerId_key',
        columns: ['provider', 'providerId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Team',
        constraint: 'Team_name_game_key',
        columns: ['name', 'game'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'TeamMember',
        constraint: 'TeamMember_teamId_nickname_key',
        columns: ['teamId', 'nickname'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Tournament',
        constraint: 'Tournament_slug_key',
        columns: ['slug'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'TournamentRegistration',
        constraint: 'TournamentRegistration_tournamentId_teamId_key',
        columns: ['tournamentId', 'teamId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AuditLog',
        index: 'AuditLog_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AuditLog',
        index: 'AuditLog_entity_entityId_idx_efadd7fc',
        columns: ['entity', 'entityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'MatchPlayerStat',
        index: 'MatchPlayerStat_matchId_idx_4caf5ecc',
        columns: ['matchId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'MatchPlayerStat',
        index: 'MatchPlayerStat_puuid_idx_38d52686',
        columns: ['puuid'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProviderIdentity',
        index: 'ProviderIdentity_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TeamMember',
        index: 'TeamMember_teamId_idx_f2b72ab3',
        columns: ['teamId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TeamMember',
        index: 'TeamMember_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TournamentMatch',
        index: 'TournamentMatch_awayTeamId_idx_17f82264',
        columns: ['awayTeamId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TournamentMatch',
        index: 'TournamentMatch_homeTeamId_idx_2a4bf710',
        columns: ['homeTeamId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TournamentMatch',
        index: 'TournamentMatch_tournamentId_idx_d0bd97a6',
        columns: ['tournamentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TournamentMatch',
        index: 'TournamentMatch_tournamentId_round_idx_16b7336b',
        columns: ['tournamentId', 'round'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TournamentRegistration',
        index: 'TournamentRegistration_registeredById_idx_6884310c',
        columns: ['registeredById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TournamentRegistration',
        index: 'TournamentRegistration_teamId_idx_f2b72ab3',
        columns: ['teamId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TournamentRegistration',
        index: 'TournamentRegistration_tournamentId_idx_d0bd97a6',
        columns: ['tournamentId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'MatchPlayerStat',
        foreignKey: {
          name: 'MatchPlayerStat_matchId_fkey',
          columns: ['matchId'],
          references: { schema: 'public', table: 'Match', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'MatchPlayerStat',
        foreignKey: {
          name: 'MatchPlayerStat_puuid_fkey',
          columns: ['puuid'],
          references: { schema: 'public', table: 'Player', columns: ['puuid'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProviderIdentity',
        foreignKey: {
          name: 'ProviderIdentity_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TeamMember',
        foreignKey: {
          name: 'TeamMember_teamId_fkey',
          columns: ['teamId'],
          references: { schema: 'public', table: 'Team', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TeamMember',
        foreignKey: {
          name: 'TeamMember_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TournamentMatch',
        foreignKey: {
          name: 'TournamentMatch_tournamentId_fkey',
          columns: ['tournamentId'],
          references: { schema: 'public', table: 'Tournament', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TournamentMatch',
        foreignKey: {
          name: 'TournamentMatch_homeTeamId_fkey',
          columns: ['homeTeamId'],
          references: { schema: 'public', table: 'Team', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TournamentMatch',
        foreignKey: {
          name: 'TournamentMatch_awayTeamId_fkey',
          columns: ['awayTeamId'],
          references: { schema: 'public', table: 'Team', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TournamentRegistration',
        foreignKey: {
          name: 'TournamentRegistration_tournamentId_fkey',
          columns: ['tournamentId'],
          references: { schema: 'public', table: 'Tournament', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TournamentRegistration',
        foreignKey: {
          name: 'TournamentRegistration_teamId_fkey',
          columns: ['teamId'],
          references: { schema: 'public', table: 'Team', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TournamentRegistration',
        foreignKey: {
          name: 'TournamentRegistration_registeredById_fkey',
          columns: ['registeredById'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
