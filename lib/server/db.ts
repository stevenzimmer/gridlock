import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

type DB = Database.Database;

declare global {
  // eslint-disable-next-line no-var
  var gravityGridDb: DB | undefined;
}

function createDb(): DB {
  const dbFile = process.env.SQLITE_PATH?.trim() || path.join(process.cwd(), "data", "gravity-grid.sqlite");
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });

  const db = new Database(dbFile);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_boards (
      date_key TEXT PRIMARY KEY,
      grid_json TEXT NOT NULL,
      valid_words_json TEXT NOT NULL DEFAULT '[]',
      model TEXT NOT NULL,
      prompt_version TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS player_daily_state (
      date_key TEXT NOT NULL,
      player_id TEXT NOT NULL,
      state_json TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (date_key, player_id),
      FOREIGN KEY (date_key) REFERENCES daily_boards(date_key)
    );
  `);

  const columns = db
    .prepare("PRAGMA table_info(daily_boards)")
    .all() as Array<{ name: string }>;
  const hasValidWordsColumn = columns.some((column) => column.name === "valid_words_json");
  if (!hasValidWordsColumn) {
    db.exec("ALTER TABLE daily_boards ADD COLUMN valid_words_json TEXT NOT NULL DEFAULT '[]';");
  }

  return db;
}

export function getDb(): DB {
  if (!globalThis.gravityGridDb) {
    globalThis.gravityGridDb = createDb();
  }
  return globalThis.gravityGridDb;
}
