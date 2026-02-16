import { sql } from "drizzle-orm";
import {
  boolean,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";
import type { GameState, Tile } from "@/lib/types";

export const dailyBoards = pgTable("daily_boards", {
  dateKey: text("date_key").primaryKey(),
  gridJson: jsonb("grid_json").$type<Tile[][]>().notNull(),
  validWordsJson: jsonb("valid_words_json").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  model: text("model").notNull(),
  promptVersion: text("prompt_version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow()
});

export const playerDailyState = pgTable(
  "player_daily_state",
  {
    dateKey: text("date_key")
      .notNull()
      .references(() => dailyBoards.dateKey),
    playerId: text("player_id").notNull(),
    stateJson: jsonb("state_json").$type<GameState>().notNull(),
    completed: boolean("completed").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.dateKey, table.playerId] })
  })
);

export const playerProfiles = pgTable(
  "player_profiles",
  {
    playerId: text("player_id").primaryKey(),
    username: text("username"),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow()
  },
  (table) => ({
    usernameUniqueIdx: uniqueIndex("idx_player_profiles_username_unique")
      .on(table.username)
      .where(sql`${table.username} IS NOT NULL`)
  })
);
