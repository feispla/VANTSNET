# Incidencias conocidas y trabajo pendiente

Registradas al cierre de la fase de completación autónoma (25/10/2026). Cada entrada indica impacto, prioridad y siguiente acción exacta.

## Incidencias resueltas (para referencia histórica)

### KT-001 — Primer deploy en Prisma Cloud falló: `OrmMigrationError: RUNNER_FAILED: undefined` (25/10/2026, RESUELTA)

**Síntoma.** El primer despliegue (`PR #13` mergeado) falló en la etapa `database-migrate` a los 547 ms. La Consola mostraba `RUNNER_FAILED` sobre la variable `COMPOSER_VANTSNET_DB_URL`; el log de Actions (`prisma-deploy.yml`) mostraba `Prisma ORM migrate (RUNNER_FAILED): undefined`. La BD y el build sí se crearon correctamente.

**Causa raíz (doble).**

1. **Faltaba el grafo de migraciones.** El pipeline de deploy de Prisma Cloud es *replay-only*: aplica migraciones versionadas commiteadas en `migrations/` pero nunca crea el esquema. El repo solo tenía `refs/db.json` + snapshot, sin paquetes de migración → en una BD nueva no hay camino «vacío → hash destino» y la migración se rechaza. El mensaje amigable de la negación no llegó a la Consola porque:
2. **Bug de mapeo de errores entre paquetes.** `composer-prisma-cloud@0.28.0` busca `result.failure.code === "MIGRATION_PATH_NOT_FOUND"` con `result.failure.summary`, pero el toolchain emite `MIGRATION.PATH_UNREACHABLE` y guarda el resumen en `error.message` (no en la propiedad `summary`) → el composer muestra `undefined`.

**Fix (PR fix/prisma-cloud-first-deploy).**

- Baseline escrito y commiteado: `migrations/app/20261025T2057_baseline/` (44 operaciones, 11 tablas), generado con `prisma migration plan --name init`; `prisma migration check` ✔.
- Validación end-to-end local contra dos Prisma Postgres temporales: réplica exacta de la etapa `database-migrate` (resolución de ref + `client.migrate` con `refHash`) aplicó 1 migración (44 ops) en BD fresca y quedó en no-op en BD ya migrada; `db verify` → «marker and schema match contract».
- Runtime corregido: el servicio recibe la URL como `COMPOSER_VANTSNET_DB_URL` (no `DATABASE_URL`); `src/prisma/db.ts` ahora resuelve `DATABASE_URL ?? COMPOSER_VANTSNET_DB_URL ?? COMPOSER_*_DB_URL`. Verificado arrancando el standalone solo con la var COMPOSER: `/api/health` → `database: ok`.
- Aviso «Duplicate node logicalId: 'vantsnet'» corregido renombrando el módulo (`module.mjs`) a `vantsnet-stack` (el nombre del servicio, que es el que genera los env vars, no cambia).

**Lección.** Cualquier cambio de contrato debe commitearse con su migración (`db:emit` + `db:plan --name <cambio>` + commit de `migrations/`); el preview del PR valida la migración en BD propia antes del merge.

## Bloqueadas por credenciales/autorización externa

| # | Elemento | Impacto | Prioridad | Siguiente acción |
|---|----------|---------|-----------|------------------|
| 1 | **Riot VAL-MATCH-V1** (partidas reales de Valorant) | Stats de Valorant limitadas al modo demo + verificación de cuentas | Alta | Enviar el expediente de `SOLICITUD-CLAVE-PRODUCCION.md` con el prototipo como evidencia |
| 2 | **Discord OAuth** implementado sin credenciales | Enlace de cuentas no operativo en producción | Alta | Crear app en discord.com/developers y definir `DISCORD_CLIENT_ID/SECRET/STATE_SECRET` + redirect URI (`docs/INTEGRATIONS.md` §3) |
| 3 | **FACEIT Data API** implementada sin server key | Búsqueda de jugadores FACEIT inactiva | Media | App en developers.faceit.com → `FACEIT_API_KEY` |
| 4 | **SonarCloud** sin `SONAR_TOKEN` | El workflow se auto-omite (no falla); no hay Quality Gate | Media | Crear organización en sonarcloud.io, importar repo, añadir secret `SONAR_TOKEN` |
| 5 | **Despliegue** — Prisma Cloud ACTIVO desde 25/10/2026 (`prisma-deploy.yml`); pendientes: definir secrets de app en el dashboard (ADMIN_TOKEN, RIOT/STEAM/DISCORD/FACEIT) y dominio propio | Ya no bloquea; faltan secrets de integraciones en el dashboard | Alta | Dashboard de Prisma Cloud → Environment → Variables (tabla de `DEPLOYMENT.md`); dominio cuando se provea |

## Pendientes de producto/ingeniería (sin bloqueo externo)

| # | Elemento | Impacto | Prioridad | Siguiente acción |
|---|----------|---------|-----------|------------------|
| 6 | **Sesiones de usuario** (el admin usa token compartido) | La autorización fina (roles, propietarios) no existe aún | Alta | NextAuth con provider Discord + roles en BD; convertir unlink/registro en flujos del propio usuario |
| 7 | **Rate limiting** en la API propia | Abuso posible de endpoints costosos en despliegue público | Alta | Cloudflare rate limiting (Opción A) o middleware con contador en memoria/Redis |
| 8 | **E2E automatizados** (Playwright) en CI | La verificación E2E actual es manual (documentada en TESTING.md) | Media | Añadir `@playwright/test` + job CI con build standalone |
| 9 | **Brackets y standings automáticos** | El bracket se gestiona con partidas manuales (round/slot); no se generan cruces ni tablas automáticamente | Media | Implementar generador por formato (single/double elimination, round robin) + tabla de posiciones con transacciones |
| 10 | **Prisma ORM 8 en release candidate** | `prisma@8.0.0-rc.27` + `@prisma/orm-postgres@8.0.0-rc.20`; la plataforma Prisma exige Prisma 8. La API puede cambiar entre RCs | Media | Vigilar changelog de Prisma; el contrato y la API están aislados en `src/prisma/` y `src/lib/db.ts` |
| 11 | **Bot de Discord** (anuncios/recordatorios de torneos) | Comunidad sin notificaciones automáticas | Media | Bot con permisos mínimos + webhooks por servidor; tras OAuth activo |
| 12 | **Cobertura cuantitativa de tests** | No se afirma cobertura medida | Baja | Añadir `vitest --coverage` al job CI |
| 13 | Dependencias sandbox no usadas (dnd-kit, mdxeditor, next-intl, next-auth…) en `package.json` | Peso de instalación mayor de lo estrictamente necesario | Baja | Depuración de dependencias en una PR dedicada (verificar sin romper shadcn/ui) |

## Decisiones de producto abiertas

- **Identidad de organizador**: ¿quién puede crear torneos cuando existan sesiones? Propuesta: rol `organizer` por servidor Discord vinculado.
- **Juegos soportados por torneo**: el modelo acepta cualquier `game`; la UI solo está plantillada para Valorant. Añadir catálogo de juegos con iconos al abrir multi-juego.
