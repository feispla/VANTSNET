# Testing de VANTSNET

## Configuración

- Framework: **Vitest** (config en `vitest.config.ts`, alias `@` → `./src`).
- Los tests no requieren red ni base de datos: prueban lógica pura determinista.

```bash
bun install                 # dependencias
bun run test                # suite completa (vitest run)
bun run test:watch          # modo watch
```

## Categorías cubiertas (`tests/unit.test.ts` — 14 tests)

| Categoría | Qué valida |
|-----------|-----------|
| Discord state HMAC | state válido pasa; firma alterada → `INVALID_STATE` (anti-CSRF); formato inválido; secreto distinto; expiración → `EXPIRED_STATE` |
| Errores FACEIT | `FaceitError` expone código + estado HTTP |
| Validadores (frontera API) | equipos y torneos válidos; roles desconocidos rechazados; defaults aplicados (game, formato, maxTeams); límites de `maxTeams`; partida completada exige ambos marcadores; sin cambios → rechazo |
| Mensajes de error | `firstIssueMessage` produce mensajes legibles con ruta del campo |
| slugify | normaliza acentos/espacios/mayúsculas; nunca devuelve cadena vacía |
| Catálogos | el conjunto de estados de torneo es el esperado |

## Verificación manual (E2E) realizada — evidencia

| Flujo | Método | Resultado |
|-------|--------|-----------|
| Golden path competitivo (equipo → torneo → inscripción → aprobación → partida → resultado 13-9 → auditoría) | curl contra `/api/*` | ✅ 11 pasos correctos |
| Validaciones (inscripción en draft 409, duplicado 409, completar sin marcador 400) | curl | ✅ |
| Estados no configurados (Discord `start`, FACEIT player) → 503 honesto | curl | ✅ |
| Admin sin token → 401 | curl | ✅ |
| UI Competitivo: tabs, detalle con datos reales, crear torneo desde UI, panel Estado | agent-browser (1280px) | ✅ |
| Responsive 375px sin overflow horizontal, footer pegado | agent-browser | ✅ |
| Regresión: demo Valorant (perfil + stats) tras los cambios | agent-browser + curl | ✅ |
| `GET /api/valorant/match/{id}` ahora 403 (antes 502) | curl | ✅ |

## Comandos de calidad completos

```bash
bun run lint        # ESLint (config eslint.config.mjs)
bun run typecheck   # tsc --noEmit (strict; ignoreBuildErrors eliminado)
bun run test        # vitest
bun run build       # build de producción Next.js
```

## Limitaciones conocidas

- No hay tests E2E automatizados (Playwright) ni de integración contra BD: la verificación E2E se realizó manualmente con curl/agent-browser y está documentada arriba. Añadir Playwright en CI es trabajo pendiente (`KNOWN_ISSUES.md`).
- La ruta real de Riot con clave de producción no puede verificarse sin la aprobación de Riot.
- Cobertura no medida cuantitativamente; no se afirma ningún porcentaje.
