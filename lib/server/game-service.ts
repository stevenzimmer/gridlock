import { GRID_COLS, GRID_ROWS, MAX_INVALID_SUBMISSIONS, MIN_WORD_LENGTH } from "@/lib/config";
import {
  applyAcceptedSelection,
  applyPunchout,
  countWildcardPattern,
  createInitialState,
  enforceHorizontalVowelLimit,
  hasHorizontalVowelRun,
  normalizeSelection,
  selectionPatternFromPositions
} from "@/lib/game";
import { createSeededRng } from "@/lib/rng";
import { type GameState, type Position, type Tile } from "@/lib/types";
import { DICTIONARY_BY_LENGTH } from "@/lib/dictionary";
import { getDateKey } from "@/lib/server/date";
import { getDb } from "@/lib/server/db";
import { getOpenAIClient, getOpenAIModel } from "@/lib/server/openai";

type BoardRow = {
  date_key: string;
  grid_json: string;
  valid_words_json: string;
  prompt_version: string;
};

type PlayerStateRow = {
  state_json: string;
  completed: number;
};

export type LeaderboardEntry = {
  playerId: string;
  displayName: string;
  dateKey: string;
  score: number;
  level: number;
  wordsCleared: number;
  longestWord: string;
  updatedAt: string;
};

type LeaderboardRow = {
  player_id: string;
  username: string | null;
  date_key: string;
  score: number | null;
  level: number | null;
  words_cleared: number | null;
  longest_word: string | null;
  updated_at: string;
};

type PlayerProfileRow = {
  username: string | null;
};

export class UsernameAlreadyExistsError extends Error {
  constructor() {
    super("Username already exists.");
    this.name = "UsernameAlreadyExistsError";
  }
}

const BOARD_PROMPT_VERSION = "v3";

type GeneratedBoardPayload = {
  board: string[][];
};

function hashDateKey(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function enforceBoardVowelRule(grid: Tile[][], seedKey: string): Tile[][] {
  return enforceHorizontalVowelLimit(grid, createSeededRng(hashDateKey(seedKey)));
}

function isTileGridShape(value: unknown): value is Tile[][] {
  if (!Array.isArray(value) || value.length !== GRID_ROWS) {
    return false;
  }

  return value.every(
    (row) =>
      Array.isArray(row) &&
      row.length === GRID_COLS &&
      row.every((tile) => {
        if (!tile || typeof tile !== "object" || !("kind" in tile)) {
          return false;
        }

        if (tile.kind === "empty" || tile.kind === "stone") {
          return true;
        }

        if (tile.kind !== "letter") {
          return false;
        }

        return (
          typeof tile.letter === "string" &&
          tile.letter.length === 1 &&
          /^[A-Z*]$/.test(tile.letter.toUpperCase()) &&
          typeof tile.isWildcard === "boolean"
        );
      })
  );
}

function isGameStateShape(value: unknown): value is GameState {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "grid" in value && isTileGridShape(value.grid);
}

function assertBoardShape(grid: string[][]): void {
  if (grid.length !== GRID_ROWS) {
    throw new Error(`Generated board had ${grid.length} rows; expected ${GRID_ROWS}.`);
  }

  for (const row of grid) {
    if (row.length !== GRID_COLS) {
      throw new Error(`Generated board had ${row.length} columns; expected ${GRID_COLS}.`);
    }
    for (const value of row) {
      if (!/^[A-Z*]$/.test(value)) {
        throw new Error(`Generated board contains invalid value: ${value}`);
      }
    }
  }
}

function boardLettersToGrid(board: string[][]): Tile[][] {
  return board.map((row) =>
    row.map((value) => {
      if (value === "*") {
        return { kind: "letter", letter: "*", isWildcard: true } as const;
      }
      return { kind: "letter", letter: value, isWildcard: false } as const;
    })
  );
}

async function generateBoardWithOpenAI(dateKey: string): Promise<Tile[][]> {
  const client = getOpenAIClient();
  const model = getOpenAIModel();

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "You generate puzzle boards. Return only valid JSON matching the required schema. Use uppercase A-Z and at most two '*' wildcards total."
      },
      {
        role: "user",
        content:
          `Generate the Grid Lock board for ${dateKey}. Rules:\n` +
          `- Grid size: ${GRID_ROWS} rows x ${GRID_COLS} cols\n` +
          "- Characters: A-Z and optional '*' wildcard\n" +
          "- Use a balanced vowel/consonant distribution\n" +
          "- Never place more than two consecutive vowels horizontally in any row\n" +
          "- Max 2 wildcards in the full grid\n" +
          "- Return only JSON."
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "daily_board",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            board: {
              type: "array",
              minItems: GRID_ROWS,
              maxItems: GRID_ROWS,
              items: {
                type: "array",
                minItems: GRID_COLS,
                maxItems: GRID_COLS,
                items: {
                  type: "string",
                  pattern: "^[A-Z*]$"
                }
              }
            }
          },
          required: ["board"]
        }
      }
    }
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("OpenAI did not return board content.");
  }

  const parsed = JSON.parse(raw) as GeneratedBoardPayload;
  assertBoardShape(parsed.board);

  const wildcardCount = parsed.board.flat().filter((v) => v === "*").length;
  if (wildcardCount > 2) {
    throw new Error("Generated board exceeded wildcard limit.");
  }

  const grid = boardLettersToGrid(parsed.board);
  return enforceBoardVowelRule(grid, dateKey);
}

function gridToBoardLetters(grid: Tile[][]): string[][] {
  return grid.map((row) =>
    row.map((tile) => {
      if (tile.kind !== "letter") {
        throw new Error("Stored daily board contains non-letter tile.");
      }
      return tile.isWildcard ? "*" : tile.letter.toUpperCase();
    })
  );
}

function computeValidWordsFromBoard(board: string[][]): string[] {
  const unique = new Set<string>();
  for (const row of board) {
    for (let start = 0; start < row.length; start++) {
      for (let end = start + MIN_WORD_LENGTH - 1; end < row.length; end++) {
        const pattern = row.slice(start, end + 1).join("");
        const candidates = DICTIONARY_BY_LENGTH.get(pattern.length);
        if (!candidates) {
          continue;
        }
        for (const candidate of candidates) {
          if (patternMatchesWord(pattern, candidate)) {
            unique.add(candidate);
          }
        }
      }
    }
  }
  return Array.from(unique);
}

function patternMatchesWord(pattern: string, word: string): boolean {
  if (pattern.length !== word.length) {
    return false;
  }
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] !== "*" && pattern[i] !== word[i]) {
      return false;
    }
  }
  return true;
}

function resolvePatternWithDictionary(pattern: string): string | null {
  const upperPattern = pattern.toUpperCase();
  const candidates = DICTIONARY_BY_LENGTH.get(upperPattern.length);
  if (!candidates) {
    return null;
  }

  for (const candidate of candidates) {
    if (patternMatchesWord(upperPattern, candidate)) {
      return candidate;
    }
  }
  return null;
}

function parseBoardValidWords(row: BoardRow): string[] {
  const parsed = JSON.parse(row.valid_words_json || "[]");
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.toUpperCase())
    .filter((value) => /^[A-Z]+$/.test(value) && value.length >= MIN_WORD_LENGTH);
}

function createInitialStateFromBoard(grid: Tile[][]): GameState {
  return {
    grid,
    score: 0,
    gameOver: false,
    tickMs: createInitialState(createSeededRng(1)).tickMs,
    level: 1,
    punchoutsRemaining: 3,
    invalidWordsSubmitted: 0,
    stats: {
      wordsCleared: 0,
      longestWord: ""
    }
  };
}

function normalizeStoredState(state: GameState): GameState {
  const nextPunchouts =
    typeof state.punchoutsRemaining === "number" && Number.isFinite(state.punchoutsRemaining)
      ? Math.max(0, Math.min(3, Math.floor(state.punchoutsRemaining)))
      : 3;
  const nextInvalidWordsSubmitted =
    typeof state.invalidWordsSubmitted === "number" && Number.isFinite(state.invalidWordsSubmitted)
      ? Math.max(0, Math.min(MAX_INVALID_SUBMISSIONS, Math.floor(state.invalidWordsSubmitted)))
      : 0;

  return {
    ...state,
    gameOver: state.gameOver || nextInvalidWordsSubmitted >= MAX_INVALID_SUBMISSIONS,
    punchoutsRemaining: nextPunchouts,
    invalidWordsSubmitted: nextInvalidWordsSubmitted
  };
}

export async function ensureDailyBoard(dateKey = getDateKey()): Promise<Tile[][]> {
  const db = getDb();

  const generateAndPersistBoard = async (): Promise<Tile[][]> => {
    const generated = await generateBoardWithOpenAI(dateKey);
    const validWords = computeValidWordsFromBoard(gridToBoardLetters(generated));

    db.prepare(
      `INSERT INTO daily_boards (date_key, grid_json, valid_words_json, model, prompt_version)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(date_key) DO UPDATE SET
         grid_json = excluded.grid_json,
         valid_words_json = excluded.valid_words_json,
         model = excluded.model,
         prompt_version = excluded.prompt_version`
    ).run(dateKey, JSON.stringify(generated), JSON.stringify(validWords), getOpenAIModel(), BOARD_PROMPT_VERSION);

    return generated;
  };

  const existing = db
    .prepare("SELECT date_key, grid_json, valid_words_json, prompt_version FROM daily_boards WHERE date_key = ?")
    .get(dateKey) as BoardRow | undefined;

  if (existing) {
    const existingGridRaw = JSON.parse(existing.grid_json) as unknown;
    if (!isTileGridShape(existingGridRaw)) {
      return generateAndPersistBoard();
    }

    const existingGrid = existingGridRaw;
    if (hasHorizontalVowelRun(existingGrid)) {
      const constrained = enforceBoardVowelRule(existingGrid, dateKey);
      const constrainedWords = computeValidWordsFromBoard(gridToBoardLetters(constrained));
      db.prepare(
        "UPDATE daily_boards SET grid_json = ?, valid_words_json = ?, prompt_version = ? WHERE date_key = ?"
      ).run(JSON.stringify(constrained), JSON.stringify(constrainedWords), BOARD_PROMPT_VERSION, dateKey);
      return constrained;
    }

    const existingWords = parseBoardValidWords(existing);
    if (existingWords.length > 0 && existing.prompt_version === BOARD_PROMPT_VERSION) {
      return existingGrid;
    }

    const boardLetters = gridToBoardLetters(existingGrid);
    const backfilledWords = computeValidWordsFromBoard(boardLetters);
    db.prepare("UPDATE daily_boards SET valid_words_json = ?, prompt_version = ? WHERE date_key = ?").run(
      JSON.stringify(backfilledWords),
      BOARD_PROMPT_VERSION,
      dateKey
    );
    return existingGrid;
  }
  return generateAndPersistBoard();
}

export async function getOrCreatePlayerState(
  playerId: string,
  dateKey = getDateKey()
): Promise<{ dateKey: string; state: GameState; completed: boolean }> {
  const db = getDb();
  await ensureDailyBoard(dateKey);

  const existing = db
    .prepare("SELECT state_json, completed FROM player_daily_state WHERE date_key = ? AND player_id = ?")
    .get(dateKey, playerId) as PlayerStateRow | undefined;

  if (existing) {
    const parsed = JSON.parse(existing.state_json) as unknown;
    if (isGameStateShape(parsed)) {
      const normalizedState = normalizeStoredState(parsed);
      const stateWasNormalized = normalizedState.punchoutsRemaining !== parsed.punchoutsRemaining;

      if (!hasHorizontalVowelRun(normalizedState.grid)) {
        if (stateWasNormalized) {
          db.prepare(
            "UPDATE player_daily_state SET state_json = ?, updated_at = CURRENT_TIMESTAMP WHERE date_key = ? AND player_id = ?"
          ).run(JSON.stringify(normalizedState), dateKey, playerId);
        }
        return {
          dateKey,
          state: normalizedState,
          completed: existing.completed === 1
        };
      }

      const constrainedState: GameState = {
        ...normalizedState,
        grid: enforceBoardVowelRule(normalizedState.grid, `${dateKey}:${playerId}`)
      };
      db.prepare(
        "UPDATE player_daily_state SET state_json = ?, updated_at = CURRENT_TIMESTAMP WHERE date_key = ? AND player_id = ?"
      ).run(JSON.stringify(constrainedState), dateKey, playerId);

      return {
        dateKey,
        state: constrainedState,
        completed: existing.completed === 1
      };
    }

    const board = await ensureDailyBoard(dateKey);
    const resetState = createInitialStateFromBoard(board);
    db.prepare(
      "UPDATE player_daily_state SET state_json = ?, completed = 0, updated_at = CURRENT_TIMESTAMP WHERE date_key = ? AND player_id = ?"
    ).run(JSON.stringify(resetState), dateKey, playerId);

    return {
      dateKey,
      state: resetState,
      completed: false
    };
  }

  const board = await ensureDailyBoard(dateKey);
  const state = createInitialStateFromBoard(board);

  try {
    db.prepare(
      "INSERT INTO player_daily_state (date_key, player_id, state_json, completed) VALUES (?, ?, ?, 0)"
    ).run(dateKey, playerId, JSON.stringify(state));
  } catch {
    const nowExisting = db
      .prepare("SELECT state_json, completed FROM player_daily_state WHERE date_key = ? AND player_id = ?")
      .get(dateKey, playerId) as PlayerStateRow | undefined;
    if (nowExisting) {
      const parsed = JSON.parse(nowExisting.state_json) as unknown;
      const normalized = isGameStateShape(parsed) ? normalizeStoredState(parsed) : state;
      return {
        dateKey,
        state: normalized,
        completed: nowExisting.completed === 1
      };
    }
    throw new Error(`Failed to create player state for ${playerId}.`);
  }

  return { dateKey, state, completed: false };
}

export async function submitPlayerSelection(
  playerId: string,
  selection: Position[],
  dateKey = getDateKey()
): Promise<{ dateKey: string; state: GameState; completed: boolean; message: string; accepted: boolean }> {
  const db = getDb();
  const current = await getOrCreatePlayerState(playerId, dateKey);

  if (current.completed) {
    return {
      dateKey,
      state: current.state,
      completed: true,
      message: "Daily run already completed.",
      accepted: false
    };
  }

  const normalized = normalizeSelection(current.state.grid, selection);
  if (!normalized.valid || normalized.positions.length < MIN_WORD_LENGTH) {
    return {
      dateKey,
      state: current.state,
      completed: false,
      message: "Invalid selection.",
      accepted: false
    };
  }

  const pattern = selectionPatternFromPositions(current.state, normalized.positions);
  const resolved = resolvePatternWithDictionary(pattern);
  if (!resolved) {
    const nextInvalidWordsSubmitted = Math.min(
      MAX_INVALID_SUBMISSIONS,
      current.state.invalidWordsSubmitted + 1
    );
    const gameOver = nextInvalidWordsSubmitted >= MAX_INVALID_SUBMISSIONS;
    const nextState: GameState = {
      ...current.state,
      invalidWordsSubmitted: nextInvalidWordsSubmitted,
      gameOver: current.state.gameOver || gameOver
    };
    const completed = nextState.gameOver;

    db.prepare(
      "UPDATE player_daily_state SET state_json = ?, completed = ?, updated_at = CURRENT_TIMESTAMP WHERE date_key = ? AND player_id = ?"
    ).run(JSON.stringify(nextState), completed ? 1 : 0, dateKey, playerId);

    const remaining = Math.max(0, MAX_INVALID_SUBMISSIONS - nextInvalidWordsSubmitted);
    return {
      dateKey,
      state: nextState,
      completed,
      message: gameOver
        ? `Invalid word. Game over after ${MAX_INVALID_SUBMISSIONS} invalid submissions.`
        : `Invalid word. ${remaining} invalid submission${remaining === 1 ? "" : "s"} remaining.`,
      accepted: false
    };
  }

  const rng = createSeededRng(Date.now());
  const wildcardCount = countWildcardPattern(pattern);
  const next = applyAcceptedSelection(current.state, normalized.positions, resolved, wildcardCount, rng);

  const completed = next.state.gameOver;

  db.prepare(
    "UPDATE player_daily_state SET state_json = ?, completed = ?, updated_at = CURRENT_TIMESTAMP WHERE date_key = ? AND player_id = ?"
  ).run(JSON.stringify(next.state), completed ? 1 : 0, dateKey, playerId);

  return {
    dateKey,
    state: next.state,
    completed,
    message: `Cleared ${resolved}`,
    accepted: true
  };
}

export async function submitPlayerPunchout(
  playerId: string,
  position: Position,
  dateKey = getDateKey()
): Promise<{ dateKey: string; state: GameState; completed: boolean; message: string; accepted: boolean }> {
  const db = getDb();
  const current = await getOrCreatePlayerState(playerId, dateKey);

  if (current.completed) {
    return {
      dateKey,
      state: current.state,
      completed: true,
      message: "Daily run already completed.",
      accepted: false
    };
  }

  const rng = createSeededRng(Date.now());
  const next = applyPunchout(current.state, position, rng);
  if (!next.accepted) {
    return {
      dateKey,
      state: current.state,
      completed: current.completed,
      message: next.message,
      accepted: false
    };
  }

  db.prepare(
    "UPDATE player_daily_state SET state_json = ?, completed = ?, updated_at = CURRENT_TIMESTAMP WHERE date_key = ? AND player_id = ?"
  ).run(JSON.stringify(next.state), current.completed ? 1 : 0, dateKey, playerId);

  return {
    dateKey,
    state: next.state,
    completed: current.completed,
    message: next.message,
    accepted: true
  };
}

export function getPlayerUsername(playerId: string): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT username FROM player_profiles WHERE player_id = ?")
    .get(playerId) as PlayerProfileRow | undefined;
  const username = row?.username?.trim();
  return username ? username : null;
}

export function upsertPlayerUsername(playerId: string, username: string | null): string | null {
  const db = getDb();
  const normalizedUsername = username?.trim() || null;

  try {
    db.prepare(
      `INSERT INTO player_profiles (player_id, username)
       VALUES (?, ?)
       ON CONFLICT(player_id) DO UPDATE SET
         username = excluded.username,
         updated_at = CURRENT_TIMESTAMP`
    ).run(playerId, normalizedUsername);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      throw new UsernameAlreadyExistsError();
    }
    throw error;
  }

  return normalizedUsername;
}

export function getLeaderboard(limit = 10): LeaderboardEntry[] {
  const db = getDb();
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const rows = db
    .prepare(
      `SELECT
         pds.player_id,
         pp.username,
         pds.date_key,
         CAST(COALESCE(json_extract(pds.state_json, '$.score'), 0) AS INTEGER) AS score,
         CAST(COALESCE(json_extract(pds.state_json, '$.level'), 1) AS INTEGER) AS level,
         CAST(COALESCE(json_extract(pds.state_json, '$.stats.wordsCleared'), 0) AS INTEGER) AS words_cleared,
         CAST(COALESCE(json_extract(pds.state_json, '$.stats.longestWord'), '') AS TEXT) AS longest_word,
         pds.updated_at
       FROM player_daily_state AS pds
       LEFT JOIN player_profiles AS pp ON pp.player_id = pds.player_id
       ORDER BY score DESC, level DESC, words_cleared DESC, LENGTH(longest_word) DESC, pds.updated_at ASC
       LIMIT ?`
    )
    .all(safeLimit) as LeaderboardRow[];

  return rows.map((row) => ({
    playerId: row.player_id,
    displayName: row.username?.trim() || row.player_id,
    dateKey: row.date_key,
    score: row.score ?? 0,
    level: row.level ?? 1,
    wordsCleared: row.words_cleared ?? 0,
    longestWord: row.longest_word ?? "",
    updatedAt: row.updated_at
  }));
}
