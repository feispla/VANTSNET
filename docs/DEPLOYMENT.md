# Despliegue de VANTSNET

> Estado: **documentado, no desplegado**. Ninguna plataforma fue tocada desde esta fase (no hay autorización de despliegue ni credenciales de dominio). Sigue exactamente la arquitectura existente (Next.js standalone + Node).

## Requisitos

- Node 20+ o Bun 1.x
- Base de datos: SQLite (dev) o Neon PostgreSQL (prod) — ver `docs/DATABASE.md`
- Variables de entorno del apartado «Configuración» (abajo)

## Construcción

```bash
bun install --frozen-lockfile
bunx prisma generate
bun run build        # output: standalone (.next/standalone)
bun run start        # sirve en :3000 (NODE_ENV=production)
```

## Opción A — VPS/Node con Cloudflare delante (recomendada para empezar)

1. Servidor Node (Docker o systemd) ejecutando `bun run start` detrás de Nginx o Caddy (TLS con Let's Encrypt).
2. Dominio en **Cloudflare**:
   - DNS → registro A/AAAA al servidor con **Proxy naranja** activado (HTTPS y caché de borda).
   - SSL/TLS → modo *Full (strict)*.
   - **WAF gestionado + Rate limiting** sobre `/api/*` (mitiga abuso de endpoints costosos).
   - Regla de caché: estáticos (`/_next/static/*`) cacheables; `/api/*` no cacheable.
3. Health check del balanceador/monitor: `GET /api/health` → `200 {"status":"healthy"}` (no expone secretos; solo booleanos de configuración).
4. Migraciones en el servidor: `bunx prisma migrate deploy` (nunca reset).

## Opción B — Cloudflare Workers/Pages (edge)

- vía `@opennextjs/cloudflare` + adaptador Prisma Neon (`@prisma/adapter-neon`).
- **No verificada en esta fase**: exige validar el runtime edge con el driver Postgres. Si se elige, hacer un pilot en un subdominio antes de migrar el tráfico.
- Nota: no desplegar la misma app dos veces; elegir una opción.

## Variables de entorno en producción

| Variable | Tipo | Uso |
|----------|------|-----|
| `DATABASE_URL` | pública | cadena Neon Postgres (`?sslmode=require`) |
| `ADMIN_TOKEN` | **secreta** | mutaciones de administración (X-Admin-Token) |
| `RIOT_API_KEY` | **secreta** | verificación/colecta Valorant |
| `STEAM_API_KEY` | **secreta** | /api/steam/resolve |
| `DISCORD_CLIENT_ID` | pública | OAuth identidad |
| `DISCORD_CLIENT_SECRET` | **secreta** | intercambio OAuth |
| `DISCORD_OAUTH_STATE_SECRET` | **secreta** | firma anti-CSRF del state |
| `DISCORD_REDIRECT_URI` | pública | p. ej. `https://tu-dominio/api/auth/discord/callback` |
| `FACEIT_API_KEY` | **secreta** | FACEIT Data API |

Guía completa de cada variable: `docs/ENVIRONMENT.md`.

## Checklist de puesta en producción

- [ ] `ADMIN_TOKEN` generado con `openssl rand -hex 32` y cargado como secret.
- [ ] `bunx prisma migrate deploy` ejecutado contra Neon (no `db push`).
- [ ] `/api/health` responde 200 tras el deploy.
- [ ] CI verde en `main` (workflow `ci.yml`).
- [ ] Secrets de Cloudflare/host cargados (nunca en el repo).
- [ ] DNS/WAF configurados y rate limiting activo en `/api/*`.
- [ ] Sin seed/resets sobre la base de producción.

## Rollback

- La app es stateless: redeploy del commit anterior (Docker tag o git revert + rebuild).
- Base de datos: point-in-time restore de Neon (branch antes de migraciones destructivas).
