import { GRID_COLS, GRID_ROWS, MAX_INVALID_SUBMISSIONS, MIN_WORD_LENGTH } from "@/lib/config";
import { buildBoardValidation } from "@/lib/board-validation";
import {
  applyAcceptedSelection,
  applyPunchout,
  createInitialState,
  enforceHorizontalVowelLimit,
  hasHorizontalVowelRun,
  normalizeSelection,
  rotateGrid,
  selectionPatternFromPositions
} from "@/lib/game";
import { createSeededRng } from "@/lib/rng";
import {
  type BoardValidation,
  type GameState,
  type Position,
  type RotationDirection,
  type Tile
} from "@/lib/types";
import { getDateKey } from "@/lib/server/date";
import { getDb } from "@/lib/server/db";
import { getOpenAIClient, getOpenAIModel } from "@/lib/server/openai";
import { dailyBoards, playerDailyState, playerProfiles } from "@/lib/server/schema";
import { and, eq, sql } from "drizzle-orm";

type BoardRow = {
  date_key: string;
  grid_json: unknown;
  valid_words_json: unknown;
  prompt_version: string;
};

type PlayerStateRow = {
  state_json: unknown;
  completed: boolean;
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
  updated_at: unknown;
};

type LeaderboardDateRow = {
  date_key: string;
};

type PlayerProfileRow = {
  username: string | null;
};

type PgError = {
  code?: string;
};

type StateEnvelope = {
  dateKey: string;
  state: GameState;
  completed: boolean;
  boardValidation: BoardValidation;
};

type ActionEnvelope = StateEnvelope & {
  message: string;
  accepted: boolean;
};

export class UsernameAlreadyExistsError extends Error {
  constructor() {
    super("Username already exists.");
    this.name = "UsernameAlreadyExistsError";
  }
}

const BOARD_PROMPT_VERSION = "v4";

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
          "You generate puzzle boards. Return only valid JSON matching the required schema. Use uppercase A-Z and at least five '*' wildcards, no more than 8 total wildcards in a board. Wildcards should never be continuous in the same row. The letters generated for a board should be based on realistic English letter frequency. Letters should appear in proportion to how often they are used in common English words. Vowels and high-frequency consonants (E, T, A, O, I, N, R, S, H, L, D) should appear often, while rare letters (Q, Z, X, J, K) should appear infrequently. Do not use a uniform distribution. Use standard English letter frequency as the probability model."
      },
      {
        role: "user",
        content:
          `Generate the Grid Lock board for ${dateKey}. Rules:\n` +
          `- Grid size: ${GRID_ROWS} rows x ${GRID_COLS} cols\n` +
          "- Characters: A-Z and '*' wildcard\n" +
          "- Use a balanced vowel/consonant distribution\n" +
          "- Never place more than two consecutive vowels horizontally in any row\n" +
          "- Max 8 wildcards in the full grid\n" +
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
  if (wildcardCount < 5) {
    throw new Error("Generated board did not meet minimum wildcard count.");
  }

  const grid = boardLettersToGrid(parsed.board);
  return enforceBoardVowelRule(grid, dateKey);
}

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  if (value === undefined || value === null) {
    return fallback;
  }
  return value as T;
}

function isBoardValidationShape(value: unknown): value is BoardValidation {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "version" in value &&
    value.version === 2 &&
    "validWords" in value &&
    Array.isArray(value.validWords) &&
    "patterns" in value &&
    typeof value.patterns === "object" &&
    value.patterns !== null &&
    "quality" in value &&
    typeof value.quality === "object" &&
    value.quality !== null
  );
}

function parseBoardValidation(row: BoardRow): BoardValidation | null {
  const parsed = parseJsonValue<unknown>(row.valid_words_json, null);

  if (isBoardValidationShape(parsed)) {
    return parsed;
  }

  if (Array.isArray(parsed)) {
    const validWords = parsed
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.toUpperCase())
      .filter((value) => /^[A-Z]+$/.test(value) && value.length >= MIN_WORD_LENGTH);

    return {
      version: 2,
      validWords,
      patterns: {},
      quality: {
        totalWords: validWords.length,
        shortWords: validWords.filter((word) => word.length <= 4).length,
        mediumWords: validWords.filter((word) => word.length >= 5 && word.length <= 6).length,
        longWords: validWords.filter((word) => word.length >= 7).length,
        topWords: [...validWords].sort((left, right) => right.length - left.length || left.localeCompare(right)).slice(0, 6)
      }
    };
  }

  return null;
}

function buildPersistedBoardValidation(grid: Tile[][]): BoardValidation {
  return buildBoardValidation(grid);
}

function isPostgresUniqueViolation(error: unknown): boolean {
  return Boolean(
    typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as PgError).code === "23505"
  );
}

function asIsoTimestamp(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return new Date().toISOString();
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

function toStateEnvelope(dateKey: string, state: GameState, completed: boolean): StateEnvelope {
  return {
    dateKey,
    state,
    completed,
    boardValidation: buildBoardValidation(state.grid)
  };
}

function buildClearMessage(word: string, scoreDelta: number): string {
  if (word.length >= 7) {
    return `Cleared ${word} for +${scoreDelta}. Huge find.`;
  }
  if (word.length >= 5) {
    return `Cleared ${word} for +${scoreDelta}. Nice find.`;
  }
  return `Cleared ${word} for +${scoreDelta}.`;
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
    const validation = buildPersistedBoardValidation(generated);

    await db
      .insert(dailyBoards)
      .values({
        dateKey,
        gridJson: generated,
        validWordsJson: validation,
        model: getOpenAIModel(),
        promptVersion: BOARD_PROMPT_VERSION
      })
      .onConflictDoUpdate({
        target: dailyBoards.dateKey,
        set: {
          gridJson: generated,
          validWordsJson: validation,
          model: getOpenAIModel(),
          promptVersion: BOARD_PROMPT_VERSION
        }
      });

    return generated;
  };

  const existing = await db.execute<BoardRow>(sql`
    SELECT date_key, grid_json, valid_words_json, prompt_version
    FROM daily_boards
    WHERE date_key = ${dateKey}
    LIMIT 1
  `);
  const existingRow = existing.rows[0];

  if (existingRow) {
    const existingGridRaw = parseJsonValue<unknown>(existingRow.grid_json, null);
    if (!isTileGridShape(existingGridRaw)) {
      return generateAndPersistBoard();
    }

    const existingGrid = existingGridRaw;
    if (hasHorizontalVowelRun(existingGrid)) {
      const constrained = enforceBoardVowelRule(existingGrid, dateKey);
      const constrainedValidation = buildPersistedBoardValidation(constrained);
      await db
        .update(dailyBoards)
        .set({
          gridJson: constrained,
          validWordsJson: constrainedValidation,
          promptVersion: BOARD_PROMPT_VERSION
        })
        .where(eq(dailyBoards.dateKey, dateKey));
      return constrained;
    }

    const existingValidation = parseBoardValidation(existingRow);
    if (existingValidation && existingValidation.patterns && existingRow.prompt_version === BOARD_PROMPT_VERSION) {
      return existingGrid;
    }

    const backfilledValidation = buildPersistedBoardValidation(existingGrid);
    await db
      .update(dailyBoards)
      .set({
        validWordsJson: backfilledValidation,
        promptVersion: BOARD_PROMPT_VERSION
      })
      .where(eq(dailyBoards.dateKey, dateKey));
    return existingGrid;
  }
  return generateAndPersistBoard();
}

export async function getOrCreatePlayerState(
  playerId: string,
  dateKey = getDateKey()
): Promise<StateEnvelope> {
  const db = getDb();
  await ensureDailyBoard(dateKey);

  const existingRows = await db.execute<PlayerStateRow>(sql`
    SELECT state_json, completed
    FROM player_daily_state
    WHERE date_key = ${dateKey} AND player_id = ${playerId}
    LIMIT 1
  `);
  const existing = existingRows.rows[0];

  if (existing) {
    const parsed = parseJsonValue<unknown>(existing.state_json, null);
    if (isGameStateShape(parsed)) {
      const normalizedState = normalizeStoredState(parsed);
      const stateWasNormalized = normalizedState.punchoutsRemaining !== parsed.punchoutsRemaining;

      if (!hasHorizontalVowelRun(normalizedState.grid)) {
        if (stateWasNormalized) {
          await db
            .update(playerDailyState)
            .set({
              stateJson: normalizedState,
              updatedAt: sql`now()`
            })
            .where(and(eq(playerDailyState.dateKey, dateKey), eq(playerDailyState.playerId, playerId)));
        }
        return toStateEnvelope(dateKey, normalizedState, existing.completed);
      }

      const constrainedState: GameState = {
        ...normalizedState,
        grid: enforceBoardVowelRule(normalizedState.grid, `${dateKey}:${playerId}`)
      };
      await db
        .update(playerDailyState)
        .set({
          stateJson: constrainedState,
          updatedAt: sql`now()`
        })
        .where(and(eq(playerDailyState.dateKey, dateKey), eq(playerDailyState.playerId, playerId)));

      return toStateEnvelope(dateKey, constrainedState, existing.completed);
    }

    const board = await ensureDailyBoard(dateKey);
    const resetState = createInitialStateFromBoard(board);
    await db
      .update(playerDailyState)
      .set({
        stateJson: resetState,
        completed: false,
        updatedAt: sql`now()`
      })
      .where(and(eq(playerDailyState.dateKey, dateKey), eq(playerDailyState.playerId, playerId)));

    return toStateEnvelope(dateKey, resetState, false);
  }

  const board = await ensureDailyBoard(dateKey);
  const state = createInitialStateFromBoard(board);

  try {
    await db.insert(playerDailyState).values({
      dateKey,
      playerId,
      stateJson: state,
      completed: false
    });
  } catch {
    const nowExistingRows = await db.execute<PlayerStateRow>(sql`
      SELECT state_json, completed
      FROM player_daily_state
      WHERE date_key = ${dateKey} AND player_id = ${playerId}
      LIMIT 1
    `);
    const nowExisting = nowExistingRows.rows[0];
    if (nowExisting) {
      const parsed = parseJsonValue<unknown>(nowExisting.state_json, null);
      const normalized = isGameStateShape(parsed) ? normalizeStoredState(parsed) : state;
      return toStateEnvelope(dateKey, normalized, nowExisting.completed);
    }
    throw new Error(`Failed to create player state for ${playerId}.`);
  }

  return toStateEnvelope(dateKey, state, false);
}

export async function submitPlayerSelection(
  playerId: string,
  selection: Position[],
  dateKey = getDateKey()
): Promise<ActionEnvelope> {
  const db = getDb();
  const current = await getOrCreatePlayerState(playerId, dateKey);

  if (current.completed) {
    return {
      ...toStateEnvelope(dateKey, current.state, true),
      message: "Daily run already completed.",
      accepted: false
    };
  }

  const normalized = normalizeSelection(current.state.grid, selection);
  if (!normalized.valid || normalized.positions.length < MIN_WORD_LENGTH) {
    return {
      ...toStateEnvelope(dateKey, current.state, false),
      message: "Invalid selection.",
      accepted: false
    };
  }

  const pattern = selectionPatternFromPositions(current.state, normalized.positions);
  const boardValidation = buildBoardValidation(current.state.grid);
  const resolved = boardValidation.patterns[pattern];
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

    await db
      .update(playerDailyState)
      .set({
        stateJson: nextState,
        completed,
        updatedAt: sql`now()`
      })
      .where(and(eq(playerDailyState.dateKey, dateKey), eq(playerDailyState.playerId, playerId)));

    const remaining = Math.max(0, MAX_INVALID_SUBMISSIONS - nextInvalidWordsSubmitted);
    return {
      ...toStateEnvelope(dateKey, nextState, completed),
      message: gameOver
        ? `Invalid word. Game over after ${MAX_INVALID_SUBMISSIONS} invalid submissions.`
        : `Invalid word. ${remaining} invalid submission${remaining === 1 ? "" : "s"} remaining.`,
      accepted: false
    };
  }

  const rng = createSeededRng(Date.now());
  const next = applyAcceptedSelection(
    current.state,
    normalized.positions,
    resolved.word,
    resolved.wildcardCount,
    rng
  );

  const completed = next.state.gameOver;

  await db
    .update(playerDailyState)
    .set({
      stateJson: next.state,
      completed,
      updatedAt: sql`now()`
    })
    .where(and(eq(playerDailyState.dateKey, dateKey), eq(playerDailyState.playerId, playerId)));

  return {
    ...toStateEnvelope(dateKey, next.state, completed),
    message: buildClearMessage(resolved.word, next.state.score - current.state.score),
    accepted: true
  };
}

export async function submitPlayerPunchout(
  playerId: string,
  position: Position,
  dateKey = getDateKey()
): Promise<ActionEnvelope> {
  const db = getDb();
  const current = await getOrCreatePlayerState(playerId, dateKey);

  if (current.completed) {
    return {
      ...toStateEnvelope(dateKey, current.state, true),
      message: "Daily run already completed.",
      accepted: false
    };
  }

  const rng = createSeededRng(Date.now());
  const next = applyPunchout(current.state, position, rng);
  if (!next.accepted) {
    return {
      ...toStateEnvelope(dateKey, current.state, current.completed),
      message: next.message,
      accepted: false
    };
  }

  await db
    .update(playerDailyState)
    .set({
      stateJson: next.state,
      completed: current.completed,
      updatedAt: sql`now()`
    })
    .where(and(eq(playerDailyState.dateKey, dateKey), eq(playerDailyState.playerId, playerId)));

  return {
    ...toStateEnvelope(dateKey, next.state, current.completed),
    message: next.message,
    accepted: true
  };
}

export async function rotatePlayerGrid(
  playerId: string,
  direction: RotationDirection,
  dateKey = getDateKey()
): Promise<ActionEnvelope> {
  const db = getDb();
  const current = await getOrCreatePlayerState(playerId, dateKey);

  if (current.completed) {
    return {
      ...toStateEnvelope(dateKey, current.state, true),
      message: "Daily run already completed.",
      accepted: false
    };
  }

  const nextState: GameState = {
    ...current.state,
    grid: rotateGrid(current.state.grid, direction)
  };

  await db
    .update(playerDailyState)
    .set({
      stateJson: nextState,
      completed: current.completed,
      updatedAt: sql`now()`
    })
    .where(and(eq(playerDailyState.dateKey, dateKey), eq(playerDailyState.playerId, playerId)));

  return {
    ...toStateEnvelope(dateKey, nextState, current.completed),
    message: direction === "clockwise" ? "Rotated clockwise." : "Rotated counterclockwise.",
    accepted: true
  };
}

export async function getPlayerUsername(playerId: string): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({
      username: playerProfiles.username
    })
    .from(playerProfiles)
    .where(eq(playerProfiles.playerId, playerId))
    .limit(1);
  const row = rows[0] as PlayerProfileRow | undefined;
  const username = row?.username?.trim();
  return username ? username : null;
}

export async function upsertPlayerUsername(
  playerId: string,
  username: string | null
): Promise<string | null> {
  const db = getDb();
  const normalizedUsername = username?.trim() || null;

  try {
    await db
      .insert(playerProfiles)
      .values({
        playerId,
        username: normalizedUsername
      })
      .onConflictDoUpdate({
        target: playerProfiles.playerId,
        set: {
          username: normalizedUsername,
          updatedAt: sql`now()`
        }
      });
  } catch (error) {
    if (isPostgresUniqueViolation(error)) {
      throw new UsernameAlreadyExistsError();
    }
    throw error;
  }

  return normalizedUsername;
}

export async function getLeaderboard(limit = 10, dateKey?: string): Promise<LeaderboardEntry[]> {
  const db = getDb();
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const dateFilter = dateKey?.trim() || null;
  const rowsResult = await db.execute<LeaderboardRow>(sql`
    SELECT
      pds.player_id,
      pp.username,
      pds.date_key,
      CAST(COALESCE(pds.state_json->>'score', '0') AS INTEGER) AS score,
      CAST(COALESCE(pds.state_json->>'level', '1') AS INTEGER) AS level,
      CAST(COALESCE(pds.state_json->'stats'->>'wordsCleared', '0') AS INTEGER) AS words_cleared,
      CAST(COALESCE(pds.state_json->'stats'->>'longestWord', '') AS TEXT) AS longest_word,
      pds.updated_at
    FROM player_daily_state AS pds
    LEFT JOIN player_profiles AS pp ON pp.player_id = pds.player_id
    ${dateFilter ? sql`WHERE pds.date_key = ${dateFilter}` : sql``}
    ORDER BY
      CAST(COALESCE(pds.state_json->>'score', '0') AS INTEGER) DESC,
      CAST(COALESCE(pds.state_json->>'level', '1') AS INTEGER) DESC,
      CAST(COALESCE(pds.state_json->'stats'->>'wordsCleared', '0') AS INTEGER) DESC,
      LENGTH(COALESCE(pds.state_json->'stats'->>'longestWord', '')) DESC,
      pds.updated_at ASC
    LIMIT ${safeLimit}
  `);
  const rows = rowsResult.rows;

  return rows.map((row) => ({
    playerId: row.player_id,
    displayName: row.username?.trim() || row.player_id,
    dateKey: row.date_key,
    score: row.score ?? 0,
    level: row.level ?? 1,
    wordsCleared: row.words_cleared ?? 0,
    longestWord: row.longest_word ?? "",
    updatedAt: asIsoTimestamp(row.updated_at)
  }));
}

export async function getLeaderboardDateKeys(limit = 30): Promise<string[]> {
  const db = getDb();
  const safeLimit = Math.max(1, Math.min(365, Math.floor(limit)));
  const rowsResult = await db.execute<LeaderboardDateRow>(sql`
    SELECT DISTINCT pds.date_key
    FROM player_daily_state AS pds
    WHERE CAST(COALESCE(pds.state_json->>'score', '0') AS INTEGER) > 0
    ORDER BY pds.date_key DESC
    LIMIT ${safeLimit}
  `);
  return rowsResult.rows.map((row) => row.date_key);
}
