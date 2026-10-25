// @ts-check
import nextjs from "@prisma/composer/nextjs";
import { compute } from "@prisma/composer-prisma-cloud";
import { postgres, dataContract } from "@prisma/composer-prisma-cloud/orm";
import vantsnetContractJson from "./src/prisma/contract.json" with { type: "json" };

export default compute({
  name: "vantsnet",
  deps: { db: postgres(dataContract(vantsnetContractJson)) },
  build: nextjs({ module: import.meta.url, appDir: "." }),
});
