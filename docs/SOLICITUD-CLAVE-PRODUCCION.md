# Solicitud de Clave de Producción — Riot Games (VALORANT)

Guía completa para solicitar la **Production API Key** de Valorant en el [Riot Developer Portal](https://developer.riotgames.com), con el texto en inglés listo para pegar en el formulario. Basada en los requisitos oficiales del portal (docs `portal`, `valorant` y `faqs`), verificados en octubre de 2026.

---

## 1. Por qué es necesaria

Riot ya **no emite claves de desarrollo (personal keys) con acceso a Valorant** — así consta en su FAQ oficial: *"personal keys are not offered for VALORANT... personal key applications requesting VALORANT access will not be approved"*. Nuestra clave actual (`RGAPI-...`) funciona para `account-v1` (verificación real de Riot IDs), pero los endpoints de datos de partidas (`VAL-MATCH-V1`) y de contenido (`VAL-CONTENT-V1`) responden `403 Forbidden`.

La única vía es una **clave de producción**, que se concede tras registrar el producto y pasar una revisión del equipo de Developer Relations. El requisito central: *"Typically requires a working prototype before receiving an API key"* — y **ya lo tenemos**: el prototipo VANTSNET funcionando en el navegador, con arquitectura real (base de datos, colector, caché y API) y modo demo verificable sin clave.

**Datos clave del programa de producción:**

| Aspecto | Detalle oficial |
|---|---|
| Límite inicial | 500 peticiones / 10 segundos · 30.000 peticiones / 10 minutos |
| Revisión | Semanal; puede tardar hasta 3 semanas |
| Un juego por clave | No se asignan varios juegos a una misma aplicación |
| Ampliar límites | Requiere buen historial, beneficio comunitario demostrado y haber superado el límite estándar |
| Coste | Gratuito |

---

## 2. Lo que evalúa Riot

Según la documentación oficial, el equipo revisa tres cosas:

1. **Legalidad y políticas** — que el producto no viole leyes ni las políticas del portal (monetización, integridad del juego, seguridad de la clave).
2. **Beneficio medible para los jugadores** — el use case debe ayudar a jugadores de forma concreta.
3. **Calidad del producto** — *"incomplete websites are unlikely to be approved"*. Piden un enlace a *"a working site, mockup, prototype, or rendering where it is easy to understand the user flows"*.

Además, para Valorant concretamente:

- **RSO (Riot Sign On) + opt-in**: *"All apps must include functionality requiring a player to opt-in to sharing their data... as well as a disclaimer within your app that account linking makes player data public"*. La aplicación debe describir cómo se implementará.
- **Seguridad**: HTTPS obligatorio, la clave nunca en el código fuente ni en binarios distribuidos.
- **Monetización**: permitida solo si existe capa gratuita y el contenido es transformador; sin apuestas.

**Cómo cumplimos cada punto:** el prototipo ya sirve la página por HTTPS, guarda la API key solo en el backend (`.env` excluido del repo vía `.gitignore`) o en el `localStorage` del usuario, muestra el disclaimer *"No afiliado a Riot Games"* en el pie de todas las vistas, es 100 % gratuito y su base de datos guarda partidas agregadas (estadísticas), no datos personales.

---

## 3. Paso a paso en el Developer Portal

1. **Publica el prototipo con URL estable** (ver sección 5). Riot necesita un enlace público; el preview del sandbox es temporal.
2. Entra en [developer.riotgames.com](https://developer.riotgames.com) con tu cuenta de Riot (la misma del portal — ya tienes el dashboard con tu clave de desarrollo).
3. En el dashboard, pulsa **"Register Project"** / **"Register Product"**.
4. Elige que es un producto **a gran escala** (producción), no personal.
5. Rellena el formulario con el texto de la sección 4 (en inglés, listo para pegar).
6. **Verifica el producto** para confirmar que eres el desarrollador.
7. Envía y espera la revisión (semanal, hasta 3 semanas). Puedes hacer seguimiento desde el dashboard.

> Consejo: si el formulario pide campos separados, cada bloque de la sección 4 corresponde a un campo típico (Name, Description, Use Case, Technical Details, Links).

---

## 4. Texto para el formulario (inglés, listo para pegar)

> Sustituye `https://TU-DOMINIO` por la URL pública del prototipo antes de enviar.

**Application / Product name:**

```
VANTSNET
```

**Product description:**

```
VANTSNET is a free web platform that lets Valorant players look up their own
performance statistics: match history, K/D/A, ACS, ADR, headshot percentage and
per-agent breakdowns, with a full scoreboard for every match. It is built as the
first game of a future multi-game statistics network (one backend, several games).

The platform is fully built and publicly accessible. It follows the official
VALORANT API pipeline end to end: Riot ID resolution (account-v1) -> match list
(VAL-MATCH-V1) -> match detail stored once in a PostgreSQL database ->
aggregated stats served to the web frontend. While we wait for production
access, the site ships with a deterministic demo dataset (Demo#VANTS) so every
user flow is testable, and real Riot ID verification through account-v1.
```

**Use case and user flows:**

```
Target users: VALORANT players who want to review their recent performance
after playing, without installing anything.

Flow 1 - Player search: the user enters a Riot ID (Name#TAG) and region in the
home search box. The backend resolves the account via
GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}.

Flow 2 - Player profile: the platform fetches the last 8 matches via
GET /val/match/v1/matches/by-puuid/{puuid}/ids and
GET /val/match/v1/matches/{matchId}, stores each match exactly once in
PostgreSQL (unique external match id), and aggregates winrate, K/D, ACS, ADR,
headshot % and most-played agents. The profile shows the 5 aggregate stat
cards, per-agent stats and a clickable match history.

Flow 3 - Match scoreboard: clicking any match opens the full 10-player
scoreboard with per-player KDA, ACS and headshot %.

Planned next flows (documented in the public roadmap): daily/weekly regional
leaderboards, Discord bot commands (/stats, /lastmatch), and a mobile app
consuming the same API.

Data opt-in (RSO): we will integrate Riot Sign On so players explicitly link
their account and opt in to data sharing before any personal profile beyond
their own searches is exposed, with a visible disclaimer that account linking
makes player data public. Until RSO is active, the platform only shows data
for Riot IDs that a visitor actively searches, and offers profile deletion on
request.
```

**Technical details:**

```
- Stack: Next.js 16 (TypeScript) + PostgreSQL + Prisma; server-side Riot API
  client; API key stored only in server environment variables, never in
  client code (HTTPS enforced).
- Data pipeline: match collection runs server-side; each match is persisted
  once with its raw JSON payload (JSONB) for reprocessing, following the
  official API best practices. Player profiles are cached; repeated lookups
  do not re-call Riot endpoints.
- Storage minimization: we store Riot IDs, puuids and per-match statistics.
  No emails, no passwords, no payment data. Players can request deletion of
  their data at any time.
- Endpoints requested and why:
  * VAL-MATCH-V1 (required): match lists and match details to build profiles
    and scoreboards - the core of the product.
  * VAL-CONTENT-V1 (required): map and agent name resolution for localized
    labels in Spanish and agent icons.
  * account-v1 (already in use): Riot ID to puuid resolution.
- Expected volume at launch: community tool, initially a few thousand
  lookups/day; the 500 req/10s production starting limit is sufficient, and
  caching further reduces upstream calls.
```

**Links:**

```
- Public prototype: https://TU-DOMINIO  (demo profile "Demo#VANTS" is fully
  browsable without any key; real Riot ID account verification is live)
- Source code / architecture docs: https://github.com/feispla/VANTSNET
  (includes architecture diagram, SQL schema and 5-phase roadmap)
```

**Monetization:**

```
None. VANTSNET is completely free; there are no ads, subscriptions or paid
features at this stage.
```

---

## 5. Publica el prototipo antes de enviar (obligatorio)

Riot pide un enlace funcional y *"incomplete websites are unlikely to be approved"*. Opciones:

**Opción A — Vercel (gratis, 10 minutos):**
1. Sube el código de la app a un repositorio (p. ej. `feispla/VANTSNET-app`) — el `.gitignore` ya excluye `.env*`, así que tu clave **no** se sube.
2. Entra en [vercel.com](https://vercel.com) con GitHub, pulsa **Import Project** y elige el repo.
3. En **Environment Variables** añade `RIOT_API_KEY` (tu clave) y `DATABASE_URL`.
4. Deploy → obtendrás `https://vantsnet.vercel.app` (o conecta `vantsnet.gg` si compras el dominio).

**Opción B — Servidor propio:** Docker + Nginx + certificado TLS (Let's Encrypt) apuntando a `valorant.vantsnet.gg`.

> El prototipo usa SQLite vía Prisma; para Vercel conviene migrar a PostgreSQL serverless (Neon, Supabase o Vercel Postgres) — cambia solo `DATABASE_URL` y `prisma db push`. Esto además acerca el prototipo al esquema PostgreSQL documentado en `ARQUITECTURA.md`.

---

## 6. Checklist antes de enviar

- [ ] Prototipo desplegado en URL pública estable y probado desde el móvil
- [ ] El perfil demo `Demo#VANTS` navega completo sin ninguna clave (buscador → perfil → scoreboard)
- [ ] Disclaimer visible: *"VANTSNET no está afiliado a Riot Games. Datos de la API oficial de Riot."*
- [ ] HTTPS activo en el dominio
- [ ] Ninguna API key en el código fuente o en el repo (`.env` ignorado por git)
- [ ] Política de datos incluida en la solicitud (sección 4, Technical details)
- [ ] Plan RSO + opt-in descrito en la solicitud
- [ ] URL del dominio sustituida en el texto de Links
- [ ] Producto verificado en el dashboard tras enviar

## 7. Qué esperar después

1. **Revisión**: semanal, hasta 3 semanas. Si piden cambios, los comentarios llegan por el portal — ajusta y responde.
2. **Aprobación**: recibirás la production key asociada a VANTSNET (solo Valorant). Cámbiala en el `.env` del servidor y el prototipo pasa a datos reales sin tocar una línea de código.
3. **Límites iniciales**: 500 req/10 s y 30.000 req/10 min — más que suficientes con la caché activa.
4. **Buenas prácticas con la clave**: nunca la subas a git, rota si se expone, y respeta los límites (la caché y el almacenado único de partidas ya lo garantizan).
5. **Mientras esperas**: el prototipo sigue útil con su modo demo y la verificación real de Riot IDs (`account-v1`); la clave de desarrollo se renueva cada 24 h en el dashboard cuando quieras volver a probar.
