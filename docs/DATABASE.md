# Base de datos VANTSNET

## Estado actual (Prisma ORM 8 + PostgreSQL)

- **ORM**: **Prisma ORM 8** (`prisma@8.0.0-rc.27` + `@prisma/orm-postgres@8.0.0-rc.20`), migrado desde Prisma 6.
- **Base de datos**: **PostgreSQL** — Prisma Postgres (la plataforma Prisma aprovisiona una al desplegar), Neon, o cualquier PostgreSQL accesible. SQLite quedó fuera del proyecto: la v8 no lo soporta de forma estable y el objetivo es paridad dev/prod.
- **Contrato**: `src/prisma/contract.prisma` (antes `schema.prisma`). Empieza con `// use prisma-8` y agrupa los modelos en `namespace public`.
- **Configuración**: `prisma.config.ts` (raíz) — apunta al contrato y toma la conexión de `DATABASE_URL`.
- **Artefactos emitidos**: `src/prisma/contract.json` y `src/prisma/contract.d.ts` los genera `prisma contract emit` y **se commitean** (la app no puede arrancar sin ellos; no hay cliente generado en `node_modules`).
- Los "enums" siguen siendo strings validados con zod en la frontera de la API (el contrato guarda `text`).

## Flujo de trabajo (Prisma ORM 8)

| Tarea | Comando | Sustituye a (Prisma 6/7) |
|---|---|---|
| Editar el modelo | editar `src/prisma/contract.prisma` | editar `schema.prisma` |
| Regenerar artefactos | `bun run db:emit` (`prisma contract emit`) | `prisma generate` |
| Aplicar a BD de desarrollo | `bun run db:update` (`prisma db update`) | `prisma db push` |
| Registrar la BD actual | `bun run db:sign` (`prisma db sign`) | — |
| Migración versionada | `bun run db:plan -- --name <cambio>` + `bun run db:migrate` (`migration plan` + `db migrate`) | `prisma migrate dev` |
| Aplicar migraciones en prod | `prisma db migrate --db "$PROD_URL"` | `prisma migrate deploy` |

Ciclo normal de un cambio: **editar contrato → `db:emit` → `db:update` (dev) → commit del contrato + `contract.json` + `contract.d.ts` + `migrations/`**. Para producción versionada, usa `db:plan` + `db:migrate` en lugar de `db:update`.

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

### Traducciones aplicadas en la migración (Prisma 6 → 8)

| Prisma 6 (schema.prisma) | Prisma 8 (contract.prisma) |
|---|---|
| `@default(cuid())` | `@onCreate(cuid(2))` |
| `DateTime @default(now())` | `TimestamptzString @default(now())` (default de BD) |
| `@updatedAt` | `@onCreate(now()) @onUpdate(now())` (lo rellena el ORM) |
| `DateTime` | `TimestamptzString` — valores como texto ISO; se normalizan a ISO-8601 UTC en la frontera de la API con `toIsoTimestamp()` |
| `db.<modelo>.findMany(...)` | `db.orm.public.<Modelo>.where(...).all()` (API encadenada) |
| `upsert({ where })` | `upsert({ conflictOn })` |
| error `P2002` | `sqlState === "23505"` (helper `isUniqueViolation`) |
| `$transaction` | `db.transaction(async (tx) => ...)` con `tx.orm` |
| `_count` en includes | `include("relacion", (r) => r.count())` o `groupBy().aggregate()` |

Nota: `MatchPlayerStat.player` pasó a **relación requerida** (la v8 exige igualar la nulidad del campo FK y `puuid` es NOT NULL). El código de colecta registra siempre al jugador antes de insertar sus stats.

## Integridad garantizada por código + esquema

1. **Anti-duplicados**: inscripciones y equipos rechazados por constraint (`sqlState 23505` → HTTP 409 con mensaje claro).
2. **Reglas de negocio en servidor**: no se inscribe en `draft`, no se excede `maxTeams`, no se cierra el plazo, partida `completed` exige ambos marcadores y una partida cerrada no se modifica (409).
3. **Transacciones**: reportar resultado usa `db.transaction`; el borrado de identidad Discord limpia usuarios huérfanos dentro de transacción; la colecta de partidas (jugadores → partida → stats) es atómica.
4. **Auditoría**: toda mutación admin registra `actor/action/entity/entityId/detail` en `AuditLog`.

## Elección de base de datos

| Opción | Cuándo | Nota |
|---|---|---|
| **Prisma Postgres** (plataforma Prisma) | despliegue en la plataforma Prisma / desarrollo sin Docker | La URL llega con el despliegue o desde console.prisma.io. Es la vía de la plataforma (formato `postgres://...@db.prisma.io:5432/postgres?sslmode=require`). |
| **Neon** | serverless con branching gratuito | `postgresql://user:pass@ep-xxx.neon.tech/vantsnet?sslmode=require` |
| **PostgreSQL local** (Docker) | desarrollo offline | `docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16` |

## Verificación realizada (migración real)

- `prisma contract emit` genera artefactos sin errores (contrato válido).
- Contra una **Prisma Postgres real**: `db update` creó las 11 tablas + FKs + índices, y un smoke test de 12 verificaciones (upserts idempotentes, transacciones, `createAll`, `whereUnique`, `include` + refinamiento `count`, `groupBy().aggregate()`, `like`, `in`, `update`, `delete`, detección de violación única y normalización de fechas) pasó **12/12**.
- CI: lint + typecheck + 14 tests + `next build` en verde (la conexión es perezosa; para build basta una `DATABASE_URL` bien formada).

> Regla: **nunca** se hace seed/reset sobre una BD de producción como parte del deploy. Los datos demo (`Demo#VANTS`) viven en código, no en la BD.
