# Auditoría del proyecto VANTSNET

Fecha: 25/10/2026 · Rama de trabajo: `fix/vantsnet-complete-project` · Auditor ejecutado de forma autónoma.

## 1. Estado inicial encontrado

### Arquitectura y stack (preexistente)

| Capa | Tecnología | Estado inicial |
|------|-----------|----------------|
| Frontend | Next.js 16 (App Router, SPA sobre `/`) + TypeScript 5 + Tailwind 4 + shadcn/ui + Zustand | Funcional |
| API | Route Handlers (`/api/valorant/*`, `/api/steam/resolve`) | Funcional con defectos |
| Base de datos | Prisma 6 + SQLite (desarrollo) | Funcional, sin modelo competitivo |
| Integraciones | Riot Games (account-v1 + demo), Steam Web API | Funcionales |
| CI/CD | 18 workflows plantilla de la galería de GitHub | **Rotos** |
| Tests | Ninguno | Ausente |
| Documentación | README + ARQUITECTURA + ROADMAP + expediente Riot | Parcial |

### Capacidades reales verificadas del estado inicial

1. **Modo demo Valorant**: búsqueda `Demo#VANTS` con 8 partidas deterministas, perfil agregado (winrate, K/D, ACS, ADR, HS%) y scoreboard por partida. ✅
2. **Ruta real Riot**: verificación de Riot IDs vía `account-v1`; `VAL-MATCH-V1` bloqueado por política de Riot para claves de desarrollo (la app lo comunica honestamente con código `FORBIDDEN_PRODUCT`). ✅
3. **Steam**: resolución de SteamID64/vanity + top de juegos. ✅

## 2. Defectos y problemas encontrados (con evidencia)

| # | Problema | Severidad | Evidencia | Estado |
|---|----------|-----------|-----------|--------|
| 1 | 18 workflows plantilla (webpack, jekyll, conda, npm-publish, pages, datadog, slsa…) sin relación con el proyecto; ~83 ejecuciones fallidas en Actions | Alta | Pestaña Actions del repo; commits `f2299d3`, `c9bf910`, etc. | **Corregido**: eliminados en esta rama; sustituidos por `ci.yml`, `codeql.yml`, `sonarcloud.yml` |
| 2 | `next.config.ts` con `typescript.ignoreBuildErrors: true` ocultaba errores reales de tipos | Alta | `next.config.ts` original | **Corregido**: flag eliminado; `tsc --noEmit` limpio |
| 3 | Error de tipos real en `match/[matchId]/route.ts`: `roundsFromTeams` exigía `roundsLost` que el payload no trae (typo semántico) | Alta | `tsc --noEmit` | **Corregido**: usa `roundsPlayed` (equivalente a rondas ganadas + perdidas por equipo) |
| 4 | Error de tipos real en `riot.ts`: literal de `ProfileAggregate` sin `winrate` | Media | `tsc --noEmit` | **Corregido** |
| 5 | `GET /api/valorant/match/{id}` devolvía **502** con `FORBIDDEN_PRODUCT` (debe ser 403) | Media | curl con `test-id` → 502 | **Corregido**: mapa de estados explícito |
| 6 | Endpoint boilerplate `GET /api` → `{ "message": "Hello, world!" }` (código muerto) | Baja | `src/app/api/route.ts` | **Eliminado** |
| 7 | `tsconfig` incluía directorios ajenos (examples/, skills/, vantsnet-repo/) en el typecheck | Baja | `tsc --noEmit` | **Corregido**: excludes |
| 8 | Sin `.env.example` en el workspace; variables de integraciones nuevas sin documentar | Media | — | **Corregido**: `.env.example` completo |
| 9 | Sin suite de tests ni quality gates de test | Alta | — | **Corregido**: vitest + 14 tests + job CI |
| 10 | Sin health endpoint ni visibilidad del estado de integraciones | Media | — | **Corregido**: `/api/health` + pestaña Estado |
| 11 | Headers de seguridad ausentes (X-Frame-Options, nosniff, Referrer-Policy…) | Media | `next.config.ts` | **Corregido**: `headers()` en next.config |
| 12 | Sin modelo de datos para el ecosistema competitivo (torneos/equipos/usuarios) | Media | `schema.prisma` | **Corregido**: esquema v2 (7 modelos nuevos) |
| 13 | `SONAR_TOKEN` no configurado → el workflow SonarQube plantilla fallaba en rojo | Media | Actions history | **Corregido**: guard que omite el análisis si falta el secret |
| 14 | El workflow `ci.yml` preparado antes usaba `npm ci` pero el repo usa `bun.lock` | Media | Revisión de lockfiles | **Corregido**: CI basado en Bun con `--frozen-lockfile` |

## 3. Lo que NO estaba roto y se conservó

- El flujo completo de estadísticas Valorant (demo + ruta real con política honesta de Riot).
- El cliente Steam y su manejo de perfiles privados.
- La identidad visual VANTSNET (oscuro #0B1120, acento #FF4655) y la arquitectura SPA de una ruta.
- El expediente de solicitud de clave de producción de Riot y la documentación existente.

## 4. Plan de remediación ejecutado

1. **Estabilización**: correcciones de tipos, códigos HTTP, limpieza de código muerto, `ignoreBuildErrors` eliminado.
2. **Arquitectura**: módulos con responsabilidad única (`lib/admin.ts`, `lib/audit.ts`, `lib/discord.ts`, `lib/faceit.ts`, `lib/validators.ts`); rutas API agrupadas por dominio (`valorant`, `steam`, `tournaments`, `teams`, `auth/discord`, `faceit`, `admin`, `health`).
3. **Base de datos**: esquema v2 con `User`, `ProviderIdentity`, `Team`, `TeamMember`, `Tournament`, `TournamentRegistration`, `TournamentMatch`, `AuditLog`; restricciones únicas anti-duplicado; migración a Neon documentada en `DATABASE.md`.
4. **Producto**: ecosistema competitivo vertical (torneos, equipos, inscripciones, partidas con validación de resultados) + panel de administración + vista «Competitivo» en la SPA.
5. **Integraciones**: Discord OAuth2 (state firmado HMAC) y FACEIT Data API con estados honestos «no configurado».
6. **CI/CD**: tres workflows reales + dependabot; eliminación de plantillas.
7. **Seguridad**: token admin con comparación en tiempo constante, validación zod en frontera, auditoría de mutaciones, headers de seguridad.
8. **Tests**: 14 tests de unidad sobre la lógica crítica (state Discord, validadores, slugify, errores FACEIT).

## 5. Criterios de aceptación por área

| Área | Criterio | Verificación |
|------|----------|--------------|
| Build | `tsc --noEmit` + `eslint .` sin errores | Ejecutado localmente ✅ |
| Tests | `bunx vitest run` verde | 14/14 ✅ |
| Ecosistema competitivo | crear equipo→torneo→inscripción→aprobación→partida→resultado→auditoría sin errores y con validaciones 400/409 correctas | curl + UI ✅ |
| Estados no configurados | `/api/auth/discord/start` y `/api/faceit/player` responden 503 honesto sin credenciales | curl ✅ |
| UI | vista Competitivo usable en 375/1280px, sin warnings de consola | agent-browser ✅ |
| CI | workflows válidos y ejecutándose en GitHub Actions | Push + observación de runs (ver FINAL_COMPLETION_REPORT) |
| Seguridad | sin secretos en el repo; mutaciones protegidas servidor-side | grep anti-fugas + curl 401 ✅ |
