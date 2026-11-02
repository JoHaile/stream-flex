// Prisma 7 CLI configuration.
// The app stores secrets in .env.local (Next.js convention), which the Prisma
// CLI does not auto-load — load it explicitly here.
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});