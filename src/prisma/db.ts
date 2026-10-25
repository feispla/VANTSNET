import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };

// Cliente Prisma ORM 8 de VANTSNET (sustituye al PrismaClient generado).
// Se cachea en globalThis para que el hot-reload de Next.js no abra una
// piscina de conexiones nueva en cada recarga durante el desarrollo.
// IMPORTANTE: no anotar el tipo de `db` — la inferencia del contrato es la
// que da los tipos por modelo a db.orm.public.<Modelo>.

export const contract = contractFromJson<Contract>(contractJson);

// Resolución de la URL de conexión:
// 1. DATABASE_URL — desarrollo local y CI (archivo .env, secret de Actions).
// 2. COMPOSER_VANTSNET_DB_URL — Prisma Cloud: el dep `db` de service.mjs se
//    inyecta en runtime con ese nombre (convención COMPOSER_<app>_<dep>_URL).
// 3. Respaldo genérico COMPOSER_*_DB_URL — inmune a renombres del servicio.
// IMPORTANTE: en Prisma Cloud, DATABASE_URL existe pero vale "-" (el composer
// la reclama con placeholder para reservarla de la plataforma; ver el source
// claimDatabaseUrlKeys de @prisma/composer-prisma-cloud). Por eso NO basta con
// `??`: se toma la primera candidata con formato plausible de URL Postgres y
// se descartan placeholders. Sin candidata válida queda undefined: el cliente
// se construye igual (pool lazy) y las queries fallan degradadas (503 en
// /api/health) en vez de reventar el arranque del módulo.
const isPlausibleDbUrl = (value: string | undefined): value is string =>
  Boolean(value && /^postgres(?:ql)?:\/\/\S+/.test(value.trim()));

const resolveDbUrl = (): string | undefined =>
  [
    process.env.DATABASE_URL,
    process.env.COMPOSER_VANTSNET_DB_URL,
    ...Object.entries(process.env)
      .filter(([key]) => /^COMPOSER_.*_DB_URL$/.test(key))
      .map(([, value]) => value),
  ].find(isPlausibleDbUrl);

const createDb = () =>
  postgres({
    contract,
    url: resolveDbUrl(),
  });

type Db = ReturnType<typeof createDb>;

const globalForPrisma = globalThis as unknown as {
  vantsnetDb?: Db;
};

export const db: Db = globalForPrisma.vantsnetDb ?? createDb();

if (process.env.NODE_ENV !== "production") globalForPrisma.vantsnetDb = db;
