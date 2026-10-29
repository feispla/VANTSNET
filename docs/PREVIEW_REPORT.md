# VANTS PREVIEW · Reporte de ejecución (F10/F11)

Fecha: 2026-10-29 · Ejecutor: Z.IA · Plan aprobado por el dueño ("aprobado sigue").
**Estado: PARADA EN F12 — producción no se toca sin autorización explícita del dueño.**

## A · Qué se construyó

| Fase | Entrega | Commit |
|------|---------|--------|
| A (F0) | Pilot CF Workers: worker `vantsnet-preview` (OpenNext 1.20.14), D1 aislada `vants-preview-db`, `wrangler.jsonc`, `open-next.config.ts`, tracing pg-cloudflare | `f064fbe` (PR #22) |
| B (F1) | Navegación SALA·TORNEOS·CLIPS: route group `(nav)`, mega menús escritorio + menú móvil, puente SPA (store Zustand sobrevive la navegación), API viva solo-lectura por service binding | `45bf2b9` (PR #23) |
| C (F2) | IA Factory: lectura real del cuartel (`vants-ai.vercel.app`: /healthz, /api/agentes, /api/ia) + pulso VANTS-BUS con 4 modos honestos; cliente bus existente con firma HMAC por service binding | `cd0674f` |
| D (F3) | rsc-harness v3.5.0 onboarded: 7 agentes, 33 skills, 9 comandos, hooks de guardia, memoria `02-DOCS/`; backups fuera del repo | `38ed1e8` |
| E (F4) | Sistema de movimiento framer-motion: tokens (duraciones/curvas/desplazamiento ≤10 px), `MotionConfig reducedMotion="user"`, AnimAparecer/AnimLista/AnimItem; SSR verificado | `6f418c6` |
| F (F5/F6) | Perfil/sesión en D1 preview: `0001_init.sql` (users + provider_identities), repositorio SQL directo + zod (Prisma intacto para pg), cookie HMAC HttpOnly TTL 30 días, API /api/sesion (+perfil, cerrar, faceit), callback Discord con almacén dual | `e0abf82` |
| G (F9) | CI: job `opennext-preview` (build del worker, sin deploy) + fix lint React | `e3aadbe` |

## B · Qué se verificó EN VIVO (https://vantsnet-preview.vants.workers.dev)

- `/` 200 · `/sala` roster real (FEISPLA owner 0.842, FEISS) + CS2/VALORANT · `/torneos` "0 torneos en total" honesto · `/clips` tarjetas reales del manifest · `/ia` cuartel OK + cerebro `glm-4.5-flash` + squad real (Agente VANTS/ORION/Vants Soporte) + BUS honesto sin credenciales.
- `/api/sesion` sin cookie → `{sesion:null}`; con cookie falsa → `null`; PATCH perfil sin sesión → 401 `SIN_SESION`; cerrar → `Set-Cookie: Max-Age=0` (cero borrados).
- SSR del movimiento: bloques con `opacity:0; translateY(10px)` animados en cliente; `reduced-motion` honrado vía MotionConfig.
- Tablas D1 `users`/`provider_identities` creadas en `vants-preview-db`.
- Calidad: `tsc` limpio · **36/36 tests** (24 previos + **las 12 pruebas de sesión P1..P12**) · lint limpio en archivos nuevos · bundle OpenNext OK.
- Producción intacta: worker `vants` y D1 `vants-db` sin ninguna escritura desde la preview (solo GET read-only).

## C · Desbloqueos de producción (cambios pequeños, directos y aprobados)

- `FACEIT_API_KEY` instalada como secret en el worker `vants`: `/api/faceit/historia` ya sirve historial real (verificado con donk666 y ZywOo). El perfil de producción queda desbloqueado.

## D · Pendientes y decisiones del dueño

1. **Credenciales "public key 1564805627979632730" + "Secret 9wrQ0ZFJ-…"**: por formato parecen **Discord OAuth** (client ID snowflake + client secret). Si lo confirmas: `wrangler secret put DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET / DISCORD_OAUTH_STATE_SECRET` en `vantsnet-preview` y el login completo (12 pruebas end-to-end con Discord real) se enciende sin tocar código. El redirect URI a registrar: `https://vantsnet-preview.vants.workers.dev/api/auth/discord/callback`.
2. **VANTS_BUS**: instalar `VANTS_BUS_URL` + `VANTS_BUS_SECRET` en el worker preview → el "Pulso del BUS" de /ia se enciende solo (cliente ya cableado).
3. **Aprobar el PR #23**: https://github.com/feispla/VANTSnetwork/pull/23 (F1..F9, 7 commits). El CI corre el job OpenNext nuevo.
4. Monitor dice "Supabase" (cosmético, heredado).

## E · Detalles técnicos que el dueño debe saber

- **Cloudflare bloquea fetch de Worker → `*.workers.dev`**: toda comunicación intra-plataforma de la preview va por **service bindings** (`VANTS_API` → `vants`, `VANTS_BUS` → `vants-bus`). Sin egress y sin URL pública expuesta.
- El campo del manifest de clips es `clips` (no `items`); el 404/502 puntual de FACEIT/manifests es rate-limit de terceros, ya cubierto por estados honestos.
- La sesión es stateless (cookie firmada): no hay tabla de sesiones que limpiar; revocar = cambiar `SESION_SECRET` (invalida todas) o logout por dispositivo (Max-Age=0).
- `db/` en .gitignore se relajó: los SQL de migración D1 (`db/d1/*.sql`) se versionan; los sqlite locales siguen ignorados.
- eslint en sandbox local OOMea (heap); en GitHub Actions (7 GB) corre bien — no es un problema del código.

## F · Decisión requerida (F12 — PARADA)

**Producción NO se toca hasta tu orden explícita.** Opciones cuando quieras:
1. Fusionar PR #23 → `main` (la preview queda versionada; producción sigue en su propio flujo).
2. Promocionar el stack preview a producción (worker OpenNext con dominio propio, D1 con esquema completo, migración de datos si procede) — requiere tu plan/OK.
3. Ajustes que decidas tras probar la preview en vivo.
