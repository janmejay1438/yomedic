/**
 * Server-only Prisma Client singleton for the Hospital Management System.
 *
 * Prisma 7 connects through a driver adapter rather than a `url` in the schema,
 * so we wire up the better-sqlite3 adapter here. The client is cached on
 * `globalThis` in development to survive Next.js hot-reloads (which would
 * otherwise exhaust connections by creating a new client on every reload).
 *
 * Never import this from a `"use client"` component — use it only in API
 * routes / server actions. Client components talk to the DB via `/api/rooms`.
 */
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
// Relative import (not the "@/" alias) so the same module also works when run
// outside Next.js — e.g. the `tsx prisma/seed.ts` seed script.
import { PrismaClient } from "../generated/prisma/client";

const DATABASE_URL = process.env.DATABASE_URL ?? "file:./dev.db";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
