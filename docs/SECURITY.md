# Seguridad de VANTSNET

Última revisión: 25/10/2026 (fase de completación autónoma).

## Controles implementados

### Gestión de secretos
- **Ningún secreto en el repo**: `.env` excluido por `.gitignore`; `.env.example` contiene solo placeholders. Se verificó con búsqueda de patrones (`RGAPI-`, `ghp_`, clave Steam) antes de cada push.
- Secretos solo en servidor: las claves de Riot/Steam/FACEIT/Discord nunca llegan al cliente; la API key de Riot opcional del usuario viaja por header `x-riot-key` y se usa server-side.
- Si un secreto se expuso alguna vez por chat (p. ej. el PAT de GitHub o claves de API), **debe rotarse** en el proveedor correspondiente; esta documentación nunca reproduce el valor.

### Autorización
- **Mutaciones de administración** (`POST/PATCH/DELETE` en tournaments, teams, audit): exigen header `X-Admin-Token` comparado en **tiempo constante** (`timingSafeEqual`) contra `ADMIN_TOKEN`. Sin `ADMIN_TOKEN` configurado, responden `503 ADMIN_NOT_CONFIGURED` (el sistema nunca queda abierto por accidente).
- Verificado: `POST /api/teams` sin token → `401 ADMIN_INVALID`.
- **Limitación conocida**: el token compartido es un patrón de prototipo. Con sesiones OAuth (Discord) el plan es roles `admin/organizer` en servidor. Registrado en `KNOWN_ISSUES.md`.

### Validación de entrada
- Todos los cuerpos de mutación se validan con **zod** en la frontera (`src/lib/validators.ts`): tipos, longitudes, rangos (maxTeams 2–128, puntuaciones 0–999, roles permitidos) y mensajes en español.
- Parámetros de ruta y query escapados por Prisma (sin SQL manual → sin inyección).

### Protección CSRF/OAuth
- El state de Discord OAuth va firmado con HMAC-SHA256 (`DISCORD_OAUTH_STATE_SECRET`), TTL de 10 minutos, comparación en tiempo constante; firma alterada → `400 INVALID_STATE`.
- Callback valida el parámetro `error` de Discord y ausencia de código/state.

### Headers de seguridad
Configurados en `next.config.ts` para todas las rutas:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### Auditoría
- Cada mutación admin escribe en `AuditLog` (actor, acción, entidad, detalle JSON, timestamp). Consultable vía `GET /api/admin/audit` (protegida).
- El fallo de auditoría no rompe la operación pero queda registrado en logs de servidor.

### Dependencias
- Dependabot activo (npm + GitHub Actions, semanal) tras merge de esta rama.
- CodeQL con `security-extended` analiza cada push/PR (results en Security → Code scanning).

## Riesgos conocidos y mitigación

| Riesgo | Estado | Mitigación |
|--------|--------|------------|
| Token admin compartido (sin sesiones) | Aceptado en prototipo | Rotación sencilla (redefinir `ADMIN_TOKEN`); migración a sesiones Discord pendiente |
| No hay rate limiting en la API propia | Pendiente | Cloudflare rate limiting (Opción A) o middleware; en `KNOWN_ISSUES.md` |
| Registro de auditoría visible solo con token | OK | Es responsabilidad de admin; no expone datos de usuarios |
| Datos de jugadores de terceros (Riot/Steam) | OK | Solo endpoints públicos oficiales; sin scraping; atribución en la UI |
| Logs con datos sensibles | OK | `db` Prisma loguea queries solo en dev; errores de API no exponen stack traces al cliente |

## Qué NO hace esta fase (por diseño)

- No se deshabilitó ninguna verificación de seguridad para «arreglar» builds.
- No se crearon usuarios de prueba en producción ni se tocaron datos reales de terceros.
- No se realizaron despliegues ni migraciones destructivas sin autorización.
