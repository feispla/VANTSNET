import "dotenv/config";
import { definePrismaConfig } from "prisma/config";
import { defineConfig as ormPostgresConfig } from "@prisma/orm-postgres/config";
import { defineConfig as composer } from "@prisma/composer/config";
import { nextjsBuild } from "@prisma/composer/nextjs/control";
import { nodeBuild } from "@prisma/composer/node/control";
import { prismaCloud, prismaState } from "@prisma/composer-prisma-cloud/control";

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
  composer: composer({
    extensions: [prismaCloud({ region: "us-east-1" }), nodeBuild(), nextjsBuild()],
    state: prismaState(),
  }),
});
