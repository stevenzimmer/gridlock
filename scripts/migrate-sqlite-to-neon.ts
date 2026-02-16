import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config as loadEnv } from "dotenv";
import { getDb } from "@/lib/server/db";
import { dailyBoards, playerDailyState, playerProfiles } from "@/lib/server/schema";
import type { GameState, Tile } from "@/lib/types";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
loadEnv();

type SqliteBoardRow = {
  date_key: string;
  grid_json: string;
  valid_words_json: string | null;
  model: string;
  prompt_version: string;
  created_at: string | null;
};

type SqlitePlayerStateRow = {
  date_key: string;
  player_id: string;
  state_json: string;
  completed: number;
  updated_at: string | null;
};

type SqliteProfileRow = {
  player_id: string;
  username: string | null;
  updated_at: string | null;
};

function parseJsonOrThrow<T>(value: string, table: string, key: string, column: string): T {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    throw new Error(
      `Invalid JSON in ${table}.${column} for ${key}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function toIsoStringOrNow(value: string | null): string {
  if (!value) {
    return new Date().toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}

async function migrateDailyBoards(sqlite: Database.Database): Promise<number> {
  const db = getDb();
  const rows = sqlite
    .prepare(
      "SELECT date_key, grid_json, valid_words_json, model, prompt_version, created_at FROM daily_boards"
    )
    .all() as SqliteBoardRow[];

  let migrated = 0;

  for (const row of rows) {
    const grid = parseJsonOrThrow<Tile[][]>(
      row.grid_json,
      "daily_boards",
      row.date_key,
      "grid_json"
    );
    const validWords = parseJsonOrThrow<string[]>(
      row.valid_words_json ?? "[]",
      "daily_boards",
      row.date_key,
      "valid_words_json"
    );

    await db
      .insert(dailyBoards)
      .values({
        dateKey: row.date_key,
        gridJson: grid,
        validWordsJson: validWords,
        model: row.model,
        promptVersion: row.prompt_version,
        createdAt: toIsoStringOrNow(row.created_at)
      })
      .onConflictDoUpdate({
        target: dailyBoards.dateKey,
        set: {
          gridJson: grid,
          validWordsJson: validWords,
          model: row.model,
          promptVersion: row.prompt_version,
          createdAt: toIsoStringOrNow(row.created_at)
        }
      });

    migrated += 1;
  }

  return migrated;
}

async function migratePlayerProfiles(sqlite: Database.Database): Promise<number> {
  const db = getDb();
  const rows = sqlite
    .prepare("SELECT player_id, username, updated_at FROM player_profiles")
    .all() as SqliteProfileRow[];

  let migrated = 0;

  for (const row of rows) {
    await db
      .insert(playerProfiles)
      .values({
        playerId: row.player_id,
        username: row.username,
        updatedAt: toIsoStringOrNow(row.updated_at)
      })
      .onConflictDoUpdate({
        target: playerProfiles.playerId,
        set: {
          username: row.username,
          updatedAt: toIsoStringOrNow(row.updated_at)
        }
      });

    migrated += 1;
  }

  return migrated;
}

async function migratePlayerDailyState(sqlite: Database.Database): Promise<number> {
  const db = getDb();
  const rows = sqlite
    .prepare("SELECT date_key, player_id, state_json, completed, updated_at FROM player_daily_state")
    .all() as SqlitePlayerStateRow[];

  let migrated = 0;

  for (const row of rows) {
    const state = parseJsonOrThrow<GameState>(
      row.state_json,
      "player_daily_state",
      `${row.date_key}:${row.player_id}`,
      "state_json"
    );

    await db
      .insert(playerDailyState)
      .values({
        dateKey: row.date_key,
        playerId: row.player_id,
        stateJson: state,
        completed: row.completed === 1,
        updatedAt: toIsoStringOrNow(row.updated_at)
      })
      .onConflictDoUpdate({
        target: [playerDailyState.dateKey, playerDailyState.playerId],
        set: {
          stateJson: state,
          completed: row.completed === 1,
          updatedAt: toIsoStringOrNow(row.updated_at)
        }
      });

    migrated += 1;
  }

  return migrated;
}

async function main(): Promise<void> {
  const sqlitePath =
    process.env.SQLITE_PATH?.trim() || path.join(process.cwd(), "data", "gravity-grid.sqlite");

  if (!fs.existsSync(sqlitePath)) {
    throw new Error(`SQLite database not found at ${sqlitePath}`);
  }

  const sqlite = new Database(sqlitePath, { readonly: true, fileMustExist: true });

  try {
    const boards = await migrateDailyBoards(sqlite);
    const profiles = await migratePlayerProfiles(sqlite);
    const states = await migratePlayerDailyState(sqlite);

    console.log(`[migrate-sqlite-to-neon] daily_boards migrated: ${boards}`);
    console.log(`[migrate-sqlite-to-neon] player_profiles migrated: ${profiles}`);
    console.log(`[migrate-sqlite-to-neon] player_daily_state migrated: ${states}`);
    console.log("[migrate-sqlite-to-neon] complete");
  } finally {
    sqlite.close();
  }
}

void main().catch((error) => {
  console.error("[migrate-sqlite-to-neon] failed", error);
  process.exit(1);
});
