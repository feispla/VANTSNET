# Roadmap de VANTSNET — Plan de construcción en 5 fases

Plan accionable para construir la red de estadísticas desde cero, fase a fase y con algo **funcionando en producción local** al final de cada etapa. Estimación para un desarrollador solo: 8–12 semanas a ritmo de hobby.

---

## Fase 1 — Primer colector: Valorant con la API de Riot (semanas 1–2)

**Objetivo:** pasar de cero a "guardo partidas reales de Valorant en mi base de datos".

1. Crear cuenta en [developer.riotgames.com](https://developer.riotgames.com) y generar la **API key de desarrollo** (renueva cada 24 h). ⚠️ Por política actual de Riot, las claves de desarrollo **no incluyen** los endpoints de datos de Valorant (`VAL-MATCH-V1`): sirven para verificar cuentas (`account-v1`) y validar la integración. Los datos de partidas reales requieren una **clave de producción** — el expediente de solicitud está preparado en [`SOLICITUD-CLAVE-PRODUCCION.md`](SOLICITUD-CLAVE-PRODUCCION.md).
2. Levantar la infraestructura base con Docker Compose: `postgres`, `redis`, `adminer`.
3. Crear el proyecto backend (Laravel 11 o Node.js + Express/Fastify) y aplicar el esquema SQL de [`ARQUITECTURA.md`](ARQUITECTURA.md) (tablas `players`, `matches`, `match_player_stats`).
4. Implementar el flujo de colecta del juego Riot:
   - `GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}` → obtiene el `puuid` a partir de `Nombre#TAG`.
   - `GET /val/match/v1/matchlists/by-puuid/{puuid}` → historial de partidas.
   - `GET /val/match/v1/matches/{matchId}` → detalle completo de cada partida.
5. Guardar cada partida **una sola vez** (el `UNIQUE (game, external_id)` lo garantiza) y desnormalizar las estadísticas por jugador en `match_player_stats`.
6. Primer comando de consola: `php artisan val:fetch "Nombre#TAG"` (o su equivalente en Node) que trae las últimas 10 partidas de un jugador.

**Criterio de aceptación:** buscar a cualquier jugador de Valorant y ver sus últimas 10 partidas persistidas en PostgreSQL con K/D/A reales.

---

## Fase 2 — Núcleo backend: API REST, caché y colas (semanas 3–4)

**Objetivo:** exponer los datos con una API propia y blindar la colecta.

1. Endpoints versionados `/v1/...`:
   - `GET /v1/valorant/profile/{region}/{riotId}` → perfil agregado (rango, winrate, K/D/A medios, agentes más jugados).
   - `GET /v1/valorant/matches/{riotId}` → historial paginado.
   - `GET /v1/leaderboard/{region}` → top jugadores por métrica.
2. **Middleware de API-Key**: tabla `api_keys` (clave, nombre del proyecto, cuota mensual). Toda petición exige `VANTS-Api-Key` en el header.
3. **Caché Redis** con TTL de 5 minutos en todos los endpoints de perfil — si el dato está fresco, ni se toca la API de Riot.
4. **Colas**: mover la colecta a jobs asíncronos (Horizon o BullMQ). El endpoint devuelve el dato cacheado y, si tiene más de X minutos, encola el refresco; el usuario nunca espera a la API de Riot.
5. **Rotación de proxies IPv6** como módulo aparte del cliente HTTP (activable por configuración, como el `PROXY_URL` de `DestinyStatus`).
6. **Monitoreo**: Sentry (plan gratuito) conectado a workers y API.

**Criterio de aceptación:** `curl -H "VANTS-Api-Key: test" .../v1/valorant/profile/eu/Nombre#TAG` responde en <100 ms con datos cacheados, y las llamadas a Riot quedan en la cola.

---

## Fase 3 — Web de estadísticas Valorant (semanas 5–6)

**Objetivo:** la cara visible: perfil, historial y detalle de partida.

1. App web (Vue 3 con Laravel, o Next.js si se eligió Node) con layout oscuro estilo gaming.
2. Páginas:
   - `/` — buscador grande "Nombre#TAG" en el centro (una pantalla de inicio centrada por completo en el buscador).
   - `/valorant/{riotId}` — perfil: tarjeta con rango, winrate, K/D/A, gráfico de progreso y agentes favoritos.
   - `/valorant/match/{matchId}` — scoreboard completo de la partida con los 10 jugadores.
3. **Atribución obligatoria** en el pie: *"VANTSNET no está afiliado a Riot Games. Datos de la API oficial de Riot."*
4. SEO básico: `title`/`description` por perfil, Open Graph con imagen del jugador (generable con Satori o similar).

**Criterio de aceptación:** un amigo puede buscar su nick y compartir el link de su perfil.

---

## Fase 4 — Multi-juego: temas e ingesta de servidores (semanas 7–9)

**Objetivo:** de un solo juego (Valorant) a una **red** multi-juego.

1. **Sistema de temas** (patrón `vue-theme-loader` del sector): un solo código base que carga paleta, logo y conjunto de páginas según el subdominio. Añadir el segundo juego es crear un tema + un colector.
2. **Segundo colector — CS2 vía Steam Web API** (el más barato de integrar): `ISteamUser/ResolveVanityURL` → `ISteamUserStats/GetUserStatsForGame`.
3. **Tercero — Destiny 2 vía Bungie API con OAuth por usuario** (replicar el flujo de `DestinyStatus`: autorizar → token → refresco automático).
4. **Ingesta de servidores** (opcional, avanzado): endpoint `POST /api/ingest/{game}` con firma secreta (HMAC) para que servidores comunitarios reporten partidas en JSON; documentar el schema esperado.
5. Dominio real + subdominios por juego (`valorant.vantsnet.gg`, `cs2.vantsnet.gg`) con Nginx y certificados wildcard.

**Criterio de aceptación:** tres juegos vivos en sus subdominios, cada uno con su tema visual, sin duplicar lógica de backend.

---

## Fase 5 — Comunidad y producto (semanas 10–12)

**Objetivo:** convertir la red en un producto con usuarios recurrentes.

1. **App móvil Flutter** consumiendo la misma `/v1` API: perfil, notificaciones push cuando se publica una nueva partida (Firebase Cloud Messaging).
2. **Bot de Discord**: `/stats valorant Nombre#TAG` y `/lastmatch` — estas plataformas crecen por boca-oreja en Discords de comunidad.
3. **Leaderboards** diarios/semanales por región con el `scheduler` (recálculo nocturno).
4. **Portal de developers**: documentación de la API pública (redoc/swagger), auto-servicio de API-Keys con cuota gratuita generosa para proyectos no comerciales.
5. **Premium** (opcional): perfiles sin anuncios, comparador de agentes, alertas de progreso — el modelo freemium típico del sector.
6. Métricas internas: jugadores buscados/día, partidas ingestadas/día, llamadas ahorradas por la caché.

**Criterio de aceptación:** un usuario nuevo llega por el bot de Discord, consulta su perfil en móvil y recibe la notificación de su última partida.

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Rate limits de Riot en crecimiento | Caché agresiva + colas + solicitar clave de producción al demostrar valor |
| Cambios de schema en las APIs de juego | Guardar siempre `raw` (JSONB) para reprocesar sin re-descargar |
| Coste de proxies IPv6 | Fase 1–2 no los necesita; activarlos solo cuando el volumen lo justifique |
| ToS restrictivos de algún editor | Verificar términos antes de añadir cada juego; priorizar juegos con APIs abiertas (Riot, Steam, Bungie) |
| Abandono del proyecto por sobrecarga | Orden de fases pensado para tener valor visible cada 2 semanas |
