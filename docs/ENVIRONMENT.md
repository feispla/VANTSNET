# Variables de entorno — referencia

Ejemplo con placeholders: `.env.example` (raíz del repo). Copiar a `.env` (excluido de Git).

| Variable | Obligatoria | Pública/secreta | Dónde se usa | Efecto si falta |
|----------|-------------|-----------------|--------------|-----------------|
| `DATABASE_URL` | Sí | pública (contiene credenciales → tratar como secreta) | `src/lib/db.ts`, Prisma | La app no arranca (Prisma falla) |
| `ADMIN_TOKEN` | Para mutaciones admin | **secreta** | `src/lib/admin.ts` (header `X-Admin-Token`) | Mutaciones admin → `503 ADMIN_NOT_CONFIGURED` (honesto, nunca abierto) |
| `RIOT_API_KEY` | No | **secreta** | `src/lib/valorant/riot.ts`, header `x-riot-key` aceptado | Solo modo demo; cuenta real → 400 `NO_KEY` |
| `STEAM_API_KEY` | No | **secreta** | `src/lib/steam/steam.ts` | `/api/steam/resolve` → error tipado `NO_KEY` |
| `DISCORD_CLIENT_ID` | Para Discord | pública | `src/lib/discord.ts` | `start` → `503 NOT_CONFIGURED` |
| `DISCORD_CLIENT_SECRET` | Para Discord | **secreta** | intercambio de código en callback | Ídem |
| `DISCORD_OAUTH_STATE_SECRET` | Para Discord | **secreta** | firma HMAC del state (anti-CSRF) | Ídem (el flujo no se inicia) |
| `DISCORD_REDIRECT_URI` | No | pública | callback | Se deriva del origen de la petición |
| `FACEIT_API_KEY` | No | **secreta** | `src/lib/faceit.ts` | `/api/faceit/player` → `503 NOT_CONFIGURED` |

## Reglas

1. **Nunca** commitear un `.env` real ni pegar secretos en issues/PRs/logs.
2. Los secretos se cargan como secrets de la plataforma (GitHub Actions Secrets, Cloudflare/dashboard del host).
3. Si un secreto se expuso (chat, log, screenshot): **rotarlo** en el proveedor y anotarlo en `docs/KNOWN_ISSUES.md` sin reproducir el valor.
4. `/api/health` solo expone **booleanos** de configuración, nunca valores.

## Generación de secretos

```bash
openssl rand -hex 32   # ADMIN_TOKEN, DISCORD_OAUTH_STATE_SECRET
```
