# Incidencias conocidas y trabajo pendiente

Registradas al cierre de la fase de completación autónoma (25/10/2026). Cada entrada indica impacto, prioridad y siguiente acción exacta.

## Bloqueadas por credenciales/autorización externa

| # | Elemento | Impacto | Prioridad | Siguiente acción |
|---|----------|---------|-----------|------------------|
| 1 | **Riot VAL-MATCH-V1** (partidas reales de Valorant) | Stats de Valorant limitadas al modo demo + verificación de cuentas | Alta | Enviar el expediente de `SOLICITUD-CLAVE-PRODUCCION.md` con el prototipo como evidencia |
| 2 | **Discord OAuth** implementado sin credenciales | Enlace de cuentas no operativo en producción | Alta | Crear app en discord.com/developers y definir `DISCORD_CLIENT_ID/SECRET/STATE_SECRET` + redirect URI (`docs/INTEGRATIONS.md` §3) |
| 3 | **FACEIT Data API** implementada sin server key | Búsqueda de jugadores FACEIT inactiva | Media | App en developers.faceit.com → `FACEIT_API_KEY` |
| 4 | **SonarCloud** sin `SONAR_TOKEN` | El workflow se auto-omite (no falla); no hay Quality Gate | Media | Crear organización en sonarcloud.io, importar repo, añadir secret `SONAR_TOKEN` |
| 5 | **Despliegue** (Cloudflare/host) no realizado | No hay entorno público verificado | Alta | Decidir Opción A/B de `DEPLOYMENT.md` y proveer dominio/credenciales — requiere autorización del propietario |

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
