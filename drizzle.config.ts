import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
loadEnv();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run Drizzle migrations.");
}

export default defineConfig({
  out: "./drizzle",
  schema: "./lib/server/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL
  }
});
