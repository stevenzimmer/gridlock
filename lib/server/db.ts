import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "@/lib/server/schema";

type DB = NeonHttpDatabase<typeof schema>;

declare global {
  // eslint-disable-next-line no-var
  var gravityGridDb: DB | undefined;
}

function createDb(): DB {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required for database access. Set it in .env.local (or exported shell env) before running database-backed scripts."
    );
  }

  const client = neon(databaseUrl);
  return drizzle(client, { schema });
}

export function getDb(): DB {
  if (!globalThis.gravityGridDb) {
    globalThis.gravityGridDb = createDb();
  }
  return globalThis.gravityGridDb;
}
