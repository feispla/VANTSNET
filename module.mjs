// @ts-check
import { module } from "@prisma/composer";
import { postgres, dataContract } from "@prisma/composer-prisma-cloud/orm";
import vantsnetContractJson from "./src/prisma/contract.json" with { type: "json" };
import vantsnetService from "./service.mjs";

export default module("vantsnet", ({ provision }) => {
  const database = provision(postgres({ name: "database", contract: dataContract(vantsnetContractJson), config: "./prisma.config.ts" }));
  provision(vantsnetService, { deps: { db: database } });
});
