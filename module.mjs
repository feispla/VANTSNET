// @ts-check
import { module } from "@prisma/composer";
import { postgres, dataContract } from "@prisma/composer-prisma-cloud/orm";
import vantsnetContractJson from "./src/prisma/contract.json" with { type: "json" };
import vantsnetService from "./service.mjs";

// NOTA: el nombre del módulo ES la identidad de la app registrada en Prisma
// Cloud — el deploy resuelve el container por appName (Management API), así
// que renombrarlo produce DEPLOY.CONTAINER_FAILED "resource-not-found".
// No renombrar sin plan de migración de estado. Ver docs/KNOWN_ISSUES.md KT-002.
export default module("vantsnet", ({ provision }) => {
  const database = provision(postgres({ name: "database", contract: dataContract(vantsnetContractJson), config: "./prisma.config.ts" }));
  provision(vantsnetService, { deps: { db: database } });
});
