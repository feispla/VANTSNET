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
//    inyecta en runtime con ese nombre (convención COMPOSER_<app>_<dep>_URL);
//    el `stash()` del boot del servicio lo escribe en process.env antes de
//    levantar el servidor Next.js.
// 3. Respaldo genérico COMPOSER_*_DB_URL — inmune a renombres del servicio.
// En ningún caso se lanza aquí: el pool conecta de forma lazy (en la primera
// query), así que `next build` funciona sin ninguna URL definida.
const resolveDbUrl = (): string | undefined =>
  process.env.DATABASE_URL ??
  process.env.COMPOSER_VANTSNET_DB_URL ??
  Object.entries(process.env).find(([key]) => /^COMPOSER_.*_DB_URL$/.test(key))?.[1];

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
