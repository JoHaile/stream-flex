import "server-only";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 no longer accepts a connection string on the client; it requires a
// driver adapter. PrismaPg wraps a `pg` pool and is connection-pooled for us.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  // Keep a syntactically valid fallback so importing this module never throws
  // during `next build` when DATABASE_URL is not configured (e.g. preview
  // deployments). Queries will still fail at runtime until a real URL is set.
  const connectionString =
    process.env.DATABASE_URL?.trim() ||
    "postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder";
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}