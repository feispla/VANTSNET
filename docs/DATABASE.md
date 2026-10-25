# Base de datos VANTSNET

## Estado actual

- **Desarrollo**: SQLite (`file:../db/custom.db`) vía Prisma 6. El esquema es portable a PostgreSQL sin cambios en los modelos (los "enums" son strings validados con zod en la frontera de la API, porque SQLite no soporta enums nativos).
- **Producción recomendada**: **Neon PostgreSQL** (serverless, branching gratuito para entornos dev/test).

## Modelos

### Capa de estadísticas (preexistente)

| Modelo | Propósito | Claves |
|--------|-----------|--------|
| `Player` | Identidad de jugador por juego | `puuid` UNIQUE |
| `Match` | Partida colectada **una sola vez** | `externalId` UNIQUE |
| `MatchPlayerStat` | Stats desnormalizadas por jugador/partida | índices en `matchId` y `puuid` |

### Ecosistema competitivo (fase de completación)

| Modelo | Propósito | Restricciones clave |
|--------|-----------|---------------------|
| `User` | Usuario interno de la plataforma | — |
| `ProviderIdentity` | Identidad externa vinculada (discord/faceit/riot/steam) | `UNIQUE(provider, providerId)` — vinculación idempotente |
| `Team` | Equipo competitivo | `UNIQUE(name, game)` |
| `TeamMember` | Plantilla del equipo | `UNIQUE(teamId, nickname)`; rol: player/captain/coach/substitute |
| `Tournament` | Torneo | `slug` UNIQUE; status: draft/registration/running/completed/cancelled |
| `TournamentRegistration` | Inscripción de equipo | `UNIQUE(tournamentId, teamId)` — sin duplicados |
| `TournamentMatch` | Partida de torneo (bracket) | índice `(tournamentId, round)`; status: scheduled/live/completed/forfeit |
| `AuditLog` | Trazabilidad de mutaciones | índices `(entity, entityId)` y `createdAt` |

### Integridad garantizada por código + esquema

1. **Anti-duplicados**: inscripciones y equipos rechazados por constraint (P2002 → HTTP 409 con mensaje claro).
2. **Reglas de negocio en servidor**: no se inscribe en `draft`, no se excede `maxTeams`, no se cierra el plazo, partida `completed` exige ambos marcadores y una partida cerrada no se modifica (409).
3. **Transacciones**: reportar resultado usa `db.$transaction`; el borrado de identidad Discord limpia usuarios huérfanos dentro de transacción.
4. **Auditoría**: toda mutación admin registra `actor/action/entity/entityId/detail` en `AuditLog`.

## Migración a Neon PostgreSQL

El provider de Prisma es estático; para pasar a Neon:

1. Crea el proyecto en [neon.tech](https://neon.tech) y copia la cadena de conexión.
2. Cambia el datasource en `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Crea la migración inicial versionada:
   ```bash
   DATABASE_URL="postgresql://…" bunx prisma migrate dev --name init
   ```
   Esto genera `prisma/migrations/` (versionada en Git, reproducible en CI y prod).
4. En producción aplica con `bunx prisma migrate deploy` (nunca `db push` ni resets).
5. Opcional (serverless/edge): usa `@prisma/adapter-neon` con el `PrismaNeon` driver adapter. En un Node runtime estándar la cadena de conexión normal con `?sslmode=require` funciona sin adapter.
6. **Backup/recovery**: usa el history point-in-time de Neon (plan gratuito incluye 7 días) y, para cambios destructivos, crea un branch de la BD antes de la migración.

> Regla: **nunca** se hace seed/reset sobre una BD de producción como parte del deploy. Los datos demo (`Demo#VANTS`) viven en código, no en la BD.
