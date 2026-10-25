# CI + Análisis estático para feispla/VANTSNET — guía de instalación

Los 4 archivos de esta carpeta van al repo así:

```
.github/
└── workflows/
    ├── ci.yml              ← copiar
    ├── codeql.yml          ← copiar
    └── sonarcloud.yml      ← copiar
sonar-project.properties    ← copiar a la RAÍZ del repo
```

> Ojo: el nombre del directorio es exactamente `.github/workflows/`
> (los workflows solo se ejecutan si están ahí, con ese nombre).

---

## Paso 0 — Limpiar los workflows plantilla (2 minutos)

La pestaña Actions acumula ~80 ejecuciones fallidas de plantillas de la galería
(webpack, Jekyll, Python/Conda, despliegues a Pages, Datadog, Astro…). Buscan
archivos que no existen en un proyecto Next.js y por eso fallan en segundos.
Antes de añadir los nuevos:

```bash
# ver todo lo que hay
gh workflow list --all

# eliminar las plantillas (ajusta la lista a lo que exista en el repo)
git rm .github/workflows/webpack.yml \
       .github/workflows/jekyll-docker.yml \
       .github/workflows/python-package-conda.yml \
       .github/workflows/node.js.yml \
       .github/workflows/sonarqube.yml \
       .github/workflows/nextjs.yml \
       .github/workflows/static.yml \
       .github/workflows/astro.yml \
       .github/workflows/datadog-synthetics.yml

git commit -m "chore: eliminar workflows plantilla que no aplican"
git push
```

Si alguno sigue apareciendo: pestaña **Actions** → workflow → **⋯ → Disable
workflow**. Las ejecuciones fallidas antiguas se pueden borrar en lote con
`gh run list --workflow=webpack.yml` + `gh run delete <id>` (opcional, cosmético).

## Paso 1 — CI (`ci.yml`) · sin configuración

Copiar y listo. En cada push/PR ejecuta: `bun install --frozen-lockfile → prisma generate → lint → build`.
El prototipo usa SQLite, así que no necesita servicios externos; solo define
`DATABASE_URL` para que Prisma compile.

**Verificación real:** CI success en el PR #1 del repo (run remoto verificado). Si falla el `build` por
variables de entorno, añádelas como `env` del paso (nunca como secrets aún).

## Paso 2 — CodeQL (`codeql.yml`) · sin configuración

Copiar y listo. GitHub lo reconoce y en cada push/PR + cada lunes lanza el
análisis semántico con el paquete ampliado (`security-extended`).

**Verificación:** pestaña **Security → Code scanning**. La primera vez tarda
5–10 min. Las alertas aparecen por rama y en los PRs. Coste: **0 €** (repo público).

## Paso 3 — SonarCloud (`sonarcloud.yml` + properties) · 10 minutos

1. Entra en <https://sonarcloud.io> con **Sign in with GitHub** (autoriza la app
   de SonarCloud).
2. Crea tu organización personal (`feispla` si está libre) → **Administration →
   Import** tu repo `VANTSNET` desde la lista de GitHub.
3. Anota los dos valores que te muestra (**organization** y **projectKey**) y
   déjalos en `sonar-project.properties`:
   - `sonar.organization=feispla`
   - `sonar.projectKey=feispla_VANTSNET`
4. Genera el token: cuenta (arriba a la derecha) → **My Account → Security →
   Generate Token**.
5. En GitHub: repo → **Settings → Secrets and variables → Actions → New
   repository secret** → nombre `SONAR_TOKEN`, valor = el token.
6. Copia `sonar-project.properties` a la raíz del repo y `sonarcloud.yml` a
   `.github/workflows/`.

**Verificación:** cada PR recibirá un comentario de sonarcloud[bot] con el
veredicto del Quality Gate, y en sonarcloud.io verás métricas (bugs, code smells,
duplicación, hotspots de seguridad). Coste: **0 €** (open source).

> ⚠️ No uses `SonarSource/sonarcloud-scan-action`: está **deprecada**. La acción
> correcta es `SonarSource/sonarqube-scan-action@v4` (sirve para SonarQube
> Server y SonarCloud), que es la que trae `sonarcloud.yml`.

## Paso 4 — Blindaje gratis extra (sin YAML)

| Interruptor | Dónde | Qué hace |
|---|---|---|
| **Secret scanning + Push protection** | Settings → Code security | Bloquea el push si detectas una clave de Riot/Steam en el código |
| **Dependabot alerts** | Settings → Code security | Avisa de CVEs en dependencias del `package-lock.json` |
| **Dependabot version updates** | Settings → Dependabot → `dependabot.yml` | PRs automáticos para subir versiones vulnerables |
| **Branch protection de `main`** | Settings → Branches | Exige CI verde (y opcionalmente el Quality Gate) antes de mergear |

## Resultado esperado

```
CI          ✅ build + lint en cada push
CodeQL      ✅ alertas de seguridad en Security -> Code scanning
SonarCloud  ✅ Quality Gate (verde/rojo) en cada PR
Coste total 0 € (repo público)
```

Esto es exactamente lo que revisa el equipo de Riot al evaluar la solicitud de
clave de producción ("incomplete websites are unlikely to be approved"): un CI
en verde y cero alertas abiertas separan VANTSNET del 90 % de las solicitudes.
