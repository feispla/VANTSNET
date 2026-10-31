# VANTS COMPETITIVE NETWORK — Arquitectura de plataforma

> Documento maestro de FASE 0. Estado: 2026-11-01 · Rama `preview/vants-cf` ·
> Worker `vantsnet-preview` · D1 `vants-preview-db`. **Producción (`vants` /
> `vants-db`) NO se toca.**

## 1. Arquitectura existente (auditada)

### Infraestructura Cloudflare (lo único con estado en producción)

| Pieza | Rol | Estado |
|---|---|---|
| Worker `vants` (producción) | API viva: torneos, FACEIT, roster, clubs | ✅ Producción — solo lectura desde preview |
| D1 `vants-db` (producción) | BD del worker `vants` | ✅ Intocable desde la preview |
| Worker `vants-bus` | VANTS-BUS: eventos entre módulos (firma HMAC) | ✅ Binding de servicio en preview |
| Worker `vantsnet-preview` | Esta web (Next.js 16 + OpenNext 1.20) | ✅ Desplegado, verificado |
| D1 `vants-preview-db` | BD aislada de la preview | ✅ `users`, `provider_identities` |
| `vants-ai.vercel.app` | IA Factory (cuartel de agentes) | ✅ Lectura real desde `/ia` |

### Sesión y datos en la preview (ya en D1)

- Sesión stateless: cookie HMAC HttpOnly (TTL 30 días) → `sesionDeCookies()`.
- Usuario + identidades (Discord, FACEIT) en D1 preview: `users`,
  `provider_identities` (migración `0001_init.sql`).
- Repositorio SQL directo con zod (`src/lib/store/d1.ts`). **Prisma queda intacto
  para el cliente pg de estadísticas de producción (solo lectura vía tracing
  pg-cloudflare); las entidades competitivas NUEVAS nacen directamente en D1.**
- Discord OAuth con almacén dual (`src/lib/discord.ts`), callback en
  `/api/auth/discord/callback`.

### UI existente

- Route group `(nav)`: `/` (SPA stats con store Zustand), `/sala`, `/torneos`,
  `/clips`, `/ia` — con estados honestos (`PanelVacio`/`PanelError`), motion
  framer-motion con `reducedMotion="user"`, mega menús + menú móvil.
- Fuente de datos de las páginas: `apiViva()` — service binding `VANTS_API`
  (worker→worker; Cloudflare bloquea fetch de Worker → `*.workers.dev`).

## 2. Arquitectura objetivo (VANTS COMPETITIVE NETWORK)

```
                    ┌──────────────────────────────────────────┐
                    │            NAVEGACIÓN GLOBAL             │
                    │ HOME PLAY TORNEOS LIGAS EQUIPOS RANKINGS │
                    │ JUGADORES COMUNIDAD STREAMS INVENTARIO   │
                    └────────────────────┬─────────────────────┘
                                         │
        ┌────────────────┬───────────────┼────────────────┬──────────────┐
        │                │               │                │              │
   ┌────▼────┐     ┌─────▼─────┐   ┌─────▼─────┐    ┌─────▼─────┐  ┌─────▼─────┐
   │  PLAY   │     │  COMPETI- │   │  RED      │    │  STATS    │  │ COSMÉTICA │
   │ cola D1 │     │ torneos,  │   │ equipos,  │    │ MMR/Elo,  │  │ inventario│
   │ ready   │     │ ligas,    │   │ jugadores,│    │ rankings, │  │ insignias,│
   │ salas DO│     │ brackets  │   │ comunidad │    │ temporadas│  │ avatares  │
   └────┬────┘     └─────┬─────┘   └─────┬─────┘    └─────┬─────┘  └─────┬─────┘
        │                │               │                │              │
        └────────────────┴───────┬───────┴────────────────┴──────────────┘
                                 │
                 ┌───────────────▼───────────────────────────────┐
                 │   WORKER PREVIEW (Next.js + OpenNext)          │
                 │   API routes · validación zod · roles · rate   │
                 │   audit · sesiones · permisos servidor         │
                 └───────────────┬───────────────────────────────┘
                                 │
      ┌──────────────┬───────────┼──────────────┬───────────────┐
      │              │           │              │               │
┌─────▼─────┐  ┌─────▼────┐ ┌───▼───┐  ┌───────▼──────┐ ┌──────▼──────┐
│ D1 PREVIEW│  │ VANTS-BUS│ │ R2    │  │ Durable Obj. │ │ INTEGRACIONES│
│ única BD: │  │ eventos  │ │ badges│  │ match rooms, │ │ FACEIT (API  │
│ todas las │  │ dedupe + │ │ banners│ │ ready check, │ │ viva ya OK) │
│ tablas    │  │ reintentos│ │ media │ │ presencia    │ │ Discord,     │
│           │  │          │ │       │ │              │ │ Twitch Helix │
└───────────┘  └──────────┘ └───────┘  └──────────────┘ └──────────────┘
```

### Decisiones técnicas (FASE 0)

1. **D1 es la única BD.** Nuevas tablas competitivas (teams, membresías de
   equipo, torneos de preview, cola de matchmaking, match_rooms, rankings,
   logros, inventario, auditoría) nacen en `vants-preview-db` con migraciones
   SQL versionadas en `db/d1/`. Sin Neon/Supabase/Postgres/Firebase nuevos.
2. **Prisma no crece.** El cliente pg existente queda congelado a lectura de
   estadísticas de producción. Cero entidades competitivas nuevas en Prisma.
   Una sola fuente de verdad por dato.
3. **VANTS-BUS intacto.** Los eventos del nuevo módulo competitivo se publican
   con el cliente existente (firma HMAC por service binding). Contrato de
   eventos compatible; nuevos tipos añadidos, nunca renombrados.
4. **Realtime sin segunda BD.** Durable Objects (evaluado para FASE 4: match
   rooms / ready check / presencia de party) coordinan tiempo real; su
   persistencia interna no compite con D1, que sigue siendo el registro
   persistente. En esta FASE 1 no se despliega ningún DO.
5. **Event-driven con persistencia primero.** Toda operación competitiva
   persiste en D1 ANTES de emitir su evento; un fallo de Discord/Twitch/BUS no
   pierde el resultado (reintentos por Queue cuando el binding exista).
6. **Honestidad de datos.** Sin datos demo presentados como reales (patrón
   `PanelVacio`/`PanelError` ya en uso). Twitch sin clave = "no configurado".
7. **Seguridad.** Rutas API: validación zod, sesión por cookie firmada, roles
   en servidor, consultas preparadas, rate limit por isolado, auditoría
   append-only (`audit_log` D1 en FASE 2+). Secretos solo en el backend.

### Identidad visual

- Negro carbón `#0B0B0F` · grafito `#15151B` · rojo VANTS `#FF4655` ·
  blanco `#F8FAFC` · plata metálica `zinc-300/400`.
- Tipografía competitiva (tracking apretado, mayúsculas en secciones),
  tarjetas compactas, iluminación roja controlada, sin look de panel admin.

## 3. Plan de migración y construcción (10 fases)

| Fase | Entrega | Verificable cuando… |
|---|---|---|
| **1 (esta)** | Shell + nav 10 secciones + hubs honestos + `/panel` (dashboard personal con sesión D1 real) | La preview despliega y `/panel` muestra el usuario real conectado o CTA Discord |
| 2 | Identidad: equipos, perfiles extendidos, amigos/party (tablas D1 `teams`, `team_members`, `friendships`) + `team.created` en BUS | Crear equipo con invitación persiste en D1 y emite evento |
| 3 | Tournament Center + motor de brackets (SE, DE, RR) + disputas | Inscribir 4 equipos genera bracket y avanza al validar resultado |
| 4 | Matchmaking + Match Room (cola D1 + DO para ready check) | Dos cuentas entran en cola, aceptan partida y el estado persiste |
| 5 | Ranking/estadísticas/temporadas (solo métricas reales de FACEIT/Riot) | El ranking lista jugadores con datos verificables |
| 6 | Logros e insignias automáticas (motor por eventos) | Completar un torneo desbloquea CHAMPION/TOP10 sin peticiones del navegador |
| 7 | Streams (Twitch Helix, App Access Token, caché) | Creadores en vivo reales se listan con estado configurado |
| 8 | Inventario/cosméticos (R2 para assets) | Las insignias oficiales se muestran desde R2 con variantes optimizadas |
| 9 | Admin Center + moderación + auditoría | Acciones sensibles quedan registradas en `audit_log` |
| 10 | QA, rendimiento, accesibilidad, seguridad | Lint+typecheck+tests+E2E verdes y recorridos de aceptación completos |

### Recorridos de aceptación (§22 del brief)

Registro → perfil → vincular cuentas → crear equipo → inscribir a torneo →
bracket → matchmaking → aceptar → validar resultado → ranking → estadísticas →
insignia automática → perfil actualizado → streams → notificaciones → admin.
Ningún módulo se declara terminado con solo interfaz visual.
