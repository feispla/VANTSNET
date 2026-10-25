# Integraciones de VANTSNET

Principio central: **estados honestos**. Si una integración no está configurada, la API responde `503 NOT_CONFIGURED` con instrucciones y la UI muestra «no configurada»; nunca se fabrican datos.

## 1. Riot Games (Valorant) — ✅ implementada y verificada

- **Módulo**: `src/lib/valorant/riot.ts`
- **Capacidades**: verificación de Riot IDs (`account-v1`), colecta de partidas cuando la clave lo permite, persistencia única por `externalId`, agregación de perfil.
- **Límite real**: `VAL-MATCH-V1` requiere clave de producción (política de Riot). La app detecta `403` y responde `FORBIDDEN_PRODUCT` con explicación y `verifiedAccount`. Expediente: `docs/SOLICITUD-CLAVE-PRODUCCION.md`.
- **Verificación**: curl demo 200; `TestUser#1234` → 403 con cuenta verificada.

## 2. Steam Web API — ✅ implementada y verificada

- **Módulo**: `src/lib/steam/steam.ts`; ruta `GET /api/steam/resolve`.
- **Capacidades**: SteamID64 / vanity / URL completa → perfil + top de juegos; detección de biblioteca privada.
- **Configuración**: `STEAM_API_KEY` (gratuita).

## 3. Discord OAuth2 — 🟡 implementada, pendiente de credenciales

- **Módulo**: `src/lib/discord.ts` + rutas `src/app/api/auth/discord/*`.
- **Flujo**:
  1. `GET /api/auth/discord/start` → redirige a Discord con `state` firmado (HMAC-SHA256, TTL 10 min, secreto en servidor).
  2. `GET /api/auth/discord/callback` → valida state (anti-CSRF, tiempo constante), intercambia `code` por token, obtiene `users/@me` y crea/vincula `User` + `ProviderIdentity` (idempotente por `UNIQUE(provider, providerId)`); redirige a `/` con `?auth=linked|error`.
  3. `DELETE /api/auth/discord/link` (admin por ahora) → desvincula y limpia usuarios huérfanos en transacción.
- **Scope**: `identify` únicamente (mínimo privilegio; sin bot, sin permisos de servidor).
- **Verificado sin credenciales**: `start` responde `503 NOT_CONFIGURED` con guía; `status` informa `configured: false`; UI muestra el estado honesto.
- **Pendiente para activar**: crear aplicación en discord.com/developers, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_OAUTH_STATE_SECRET`, redirect URI `https://<dominio>/api/auth/discord/callback`.
- **Futuro (no implementado)**: bot de anuncios de torneos y recordatorios — requiere bot token y permisos por servidor; queda como trabajo pendiente en `KNOWN_ISSUES.md`.

## 4. FACEIT Data API v4 — 🟡 implementada, pendiente de credenciales

- **Módulo**: `src/lib/faceit.ts`; ruta `GET /api/faceit/player?nickname=X`.
- **Capacidades**: búsqueda por nickname (`/players`), datos de juegos (skill level, ELO) e historial reciente (`/players/{id}/history`, máx. 20). Timeouts de 10 s y errores tipados (`INVALID_KEY`, `NOT_FOUND`, `RATE_LIMIT`, `NETWORK`).
- **Verificado sin credenciales**: `503 NOT_CONFIGURED` honesto.
- **Pendiente para activar**: app en developers.faceit.com → server-side key → `FACEIT_API_KEY`.

## 5. Cloudflare — 📋 documentado, pendiente de decisión de despliegue

VANTSNET es una app Next.js con backend (Prisma + rutas API). Opciones evaluadas en `docs/DEPLOYMENT.md`:

- **Opción A (recomendada para empezar)**: Node/VPS con Cloudflare como proxy (DNS, WAF gestionado, rate limiting, HTTPS) delante del servidor Node. Sin cambios de arquitectura; `/api/health` sirve como health check del balanceador.
- **Opción B (edge)**: `@opennextjs/cloudflare` para Workers/Pages + Neon Hyperdrive; **no verificada** en esta fase (Prisma ORM 8 usa `@prisma/orm-postgres` sobre TCP; para edge se evaluaría el driver serverless de Prisma Postgres).

No se ha desplegado nada en Cloudflare desde esta fase (requiere autorización y credenciales del dominio).

## 6. Referencia técnica: Tracker Network

Estudiada como **referencia de arquitectura** (patrones de caché TTL, persistencia única de partidas, API keys por proyecto, atribución legal). No se usa su código ni su marca, y **no existe API pública de Tracker Network para VALORANT**: la fuente autorizada para Valorant es la plataforma de desarrolladores de Riot Games (verificada en esta fase). Estado de las integraciones resumido en `docs/FINAL_COMPLETION_REPORT.md`.
