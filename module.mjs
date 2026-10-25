// @ts-check
import { module } from "@prisma/composer";
import { postgres, dataContract } from "@prisma/composer-prisma-cloud/orm";
import vantsnetContractJson from "./src/prisma/contract.json" with { type: "json" };
import vantsnetService from "./service.mjs";

// El nombre del módulo NO puede repetir el nombre del servicio ("vantsnet"):
// la plataforma valida la topología por logicalId y un duplicado hace que
// rechace registrar el grafo (HTTP 422 "Duplicate node logicalId"). El nombre
// del servicio es el que genera los env vars (COMPOSER_VANTSNET_DB_URL).
export default module("vantsnet-stack", ({ provision }) => {
  const database = provision(postgres({ name: "database", contract: dataContract(vantsnetContractJson), config: "./prisma.config.ts" }));
  provision(vantsnetService, { deps: { db: database } });
});
