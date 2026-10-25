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

const createDb = () =>
  postgres({
    contract,
    url: process.env.DATABASE_URL!,
  });

type Db = ReturnType<typeof createDb>;

const globalForPrisma = globalThis as unknown as {
  vantsnetDb?: Db;
};

export const db: Db = globalForPrisma.vantsnetDb ?? createDb();

if (process.env.NODE_ENV !== "production") globalForPrisma.vantsnetDb = db;
