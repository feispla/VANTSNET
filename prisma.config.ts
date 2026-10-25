import "dotenv/config";
import { definePrismaConfig } from "prisma/config";
import { defineConfig as ormPostgresConfig } from "@prisma/orm-postgres/config";

// Configuración de Prisma ORM 8 para VANTSNET.
// - El contrato vive en src/prisma/contract.prisma; `prisma contract emit`
//   escribe contract.json y contract.d.ts junto a él (se commitean).
// - La conexión sale de DATABASE_URL (Prisma Postgres, Neon o cualquier
//   PostgreSQL). Ver docs/DATABASE.md.
export default definePrismaConfig({
  orm: ormPostgresConfig({
    contract: "./src/prisma/contract.prisma",
    db: {
      connection: process.env.DATABASE_URL!,
    },
  }),
});
