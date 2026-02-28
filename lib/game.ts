import {
  BASE_TICK_MS,
  GRID_COLS,
  GRID_ROWS,
  LETTER_TILE_WEIGHT,
  MAX_WILDCARDS_PER_WORD,
  MIN_TICK_MS,
  MIN_WORD_LENGTH,
  ROW_CLEAR_COUNTS_STONES,
  SPAWN_MAX,
  SPAWN_MIN,
  STONE_TILE_WEIGHT,
  TICK_DECAY_PER_LEVEL,
  WILDCARD_TILE_WEIGHT
} from "@/lib/config";
import type { GameState, Grid, Position, RotationDirection, SelectionResult, Tile } from "@/lib/types";
import type { RNG } from "@/lib/rng";

const LETTER_DISTRIBUTION = "EEEEEEEEEAAAAAAIIIIIOOOOUUUUNNNNNNRRRRRRTTTTTLLLLSSSSDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ";
const CONSONANT_DISTRIBUTION = LETTER_DISTRIBUTION.replace(/[AEIOU]/g, "");
const VOWELS = new Set(["A", "E", "I", "O", "U"]);

export function createInitialState(rng: RNG): GameState {
  const initialGrid = createEmptyGrid(GRID_ROWS, GRID_COLS);
  const filledGrid = refillEmptyCells(initialGrid, rng, true);
  const constrainedGrid = enforceHorizontalVowelLimit(filledGrid, rng);

  return {
    grid: constrainedGrid,
    score: 0,
    gameOver: false,
    tickMs: BASE_TICK_MS,
    level: 1,
    punchoutsRemaining: 3,
    invalidWordsSubmitted: 0,
    stats: {
      wordsCleared: 0,
      longestWord: ""
    }
  };
}

export function createEmptyGrid(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ kind: "empty" } as Tile))
  );
}

export function tick(state: GameState, rng: RNG): GameState {
  if (state.gameOver) {
    return state;
  }

  const spawnCount = getSpawnCount(state.level, rng);
  const columns = chooseUniqueColumns(spawnCount, GRID_COLS, rng);
  const nextGrid = cloneGrid(state.grid);

  for (const col of columns) {
    if (nextGrid[0][col].kind !== "empty") {
      continue;
    }
    nextGrid[0][col] = createSpawnTile(rng, false);
  }

  const settled = applyGravity(nextGrid);
  const refilled = refillEmptyCells(settled, rng, false);
  const constrained = enforceHorizontalVowelLimit(refilled, rng);
  return { ...state, grid: constrained };
}

export function submitSelection(
  state: GameState,
  selection: Position[],
  dictionary: Set<string>,
  rng: RNG
): { state: GameState; result: SelectionResult } {
  const normalized = normalizeSelection(state.grid, selection);
  if (!normalized.valid || normalized.positions.length < MIN_WORD_LENGTH) {
    return { state, result: { accepted: false } };
  }

  const pattern = normalized.positions
    .map(({ row, col }) => {
      const tile = state.grid[row][col];
      if (tile.kind !== "letter") {
        return "";
      }
      return tile.isWildcard ? "*" : tile.letter;
    })
    .join("");

  const resolved = resolveWildcardWord(pattern, dictionary);
  if (!resolved) {
    return { state, result: { accepted: false } };
  }

  const wildcardCount = countWildcardPattern(pattern);
  return applyAcceptedSelection(state, normalized.positions, resolved, wildcardCount, rng);
}

export function applyAcceptedSelection(
  state: GameState,
  positions: Position[],
  resolvedWord: string,
  wildcardCount: number,
  rng: RNG
): { state: GameState; result: SelectionResult } {
  if (positions.length === 0) {
    return { state, result: { accepted: false } };
  }

  const row = positions[0].row;
  const beforeRow = state.grid[row];
  const clearedGrid = cloneGrid(state.grid);

  for (const { row: r, col } of positions) {
    clearedGrid[r][col] = { kind: "empty" };
  }

  const rowClear = didRowClear(beforeRow, clearedGrid[row]);
  const gravityGrid = applyGravity(clearedGrid);
  const refilledGrid = refillEmptyCells(gravityGrid, rng, false);
  const constrainedGrid = enforceHorizontalVowelLimit(refilledGrid, rng);
  const gained = scoreWord(resolvedWord, wildcardCount, rowClear);
  const wordsCleared = state.stats.wordsCleared + 1;
  const longestWord =
    resolvedWord.length > state.stats.longestWord.length ? resolvedWord : state.stats.longestWord;
  const level = getLevel(wordsCleared);

  return {
    state: {
      ...state,
      grid: constrainedGrid,
      score: state.score + gained,
      level,
      tickMs: getTickMs(level),
      punchoutsRemaining: state.punchoutsRemaining,
      invalidWordsSubmitted: state.invalidWordsSubmitted,
      stats: {
        wordsCleared,
        longestWord
      }
    },
    result: {
      accepted: true,
      selectedWord: resolvedWord,
      wildcardCount,
      rowClear
    }
  };
}

export function applyPunchout(
  state: GameState,
  position: Position,
  rng: RNG
): { state: GameState; accepted: boolean; message: string } {
  if (state.punchoutsRemaining <= 0) {
    return { state, accepted: false, message: "No punchouts remaining for today." };
  }

  const tile = state.grid[position.row]?.[position.col];
  if (!tile || tile.kind !== "letter") {
    return { state, accepted: false, message: "Only letters can be punched out." };
  }

  const nextGrid = cloneGrid(state.grid);
  nextGrid[position.row][position.col] = { kind: "empty" };
  const gravityGrid = applyGravity(nextGrid);
  const refilledGrid = refillEmptyCells(gravityGrid, rng, false);
  const constrainedGrid = enforceHorizontalVowelLimit(refilledGrid, rng);

  return {
    state: {
      ...state,
      grid: constrainedGrid,
      punchoutsRemaining: state.punchoutsRemaining - 1,
      invalidWordsSubmitted: state.invalidWordsSubmitted
    },
    accepted: true,
    message: "Punchout used."
  };
}

export function selectionPatternFromPositions(state: GameState, positions: Position[]): string {
  return positions
    .map(({ row, col }) => {
      const tile = state.grid[row][col];
      if (tile.kind !== "letter") {
        return "";
      }
      return tile.isWildcard ? "*" : tile.letter;
    })
    .join("");
}

export function countWildcardPattern(pattern: string): number {
  return [...pattern].filter((ch) => ch === "*").length;
}

export function scoreWord(word: string, wildcardCount: number, rowClear: boolean): number {
  const len = word.length;
  let base = 0;

  if (len <= 2) base = 0;
  else if (len === 3) base = 10;
  else if (len === 4) base = 20;
  else if (len === 5) base = 40;
  else if (len === 6) base = 80;
  else if (len === 7) base = 120;
  else base = 160 + 20 * (len - 8);

  const wildcardAdjusted = Math.floor(base * 0.85 ** wildcardCount);
  return wildcardAdjusted + (rowClear ? 100 : 0);
}

export function applyGravity(grid: Grid): Grid {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const next = createEmptyGrid(rows, cols);

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      if (grid[row][col].kind === "stone") {
        next[row][col] = { kind: "stone" };
      }
    }

    let segmentTop = 0;
    while (segmentTop < rows) {
      let segmentBottom = segmentTop;
      while (segmentBottom < rows && grid[segmentBottom][col].kind !== "stone") {
        segmentBottom++;
      }

      const letters: Tile[] = [];
      for (let row = segmentTop; row < segmentBottom; row++) {
        const tile = grid[row][col];
        if (tile.kind === "letter") {
          letters.push(tile);
        }
      }

      let write = segmentBottom - 1;
      for (let i = letters.length - 1; i >= 0; i--) {
        next[write][col] = letters[i];
        write--;
      }

      segmentTop = segmentBottom + 1;
    }
  }

  return next;
}

export function selectionToDisplay(grid: Grid, selection: Position[]): string {
  const normalized = normalizeSelection(grid, selection);
  if (!normalized.valid) {
    return "";
  }
  return normalized.positions
    .map(({ row, col }) => {
      const tile = grid[row][col];
      if (tile.kind !== "letter") {
        return "";
      }
      return tile.isWildcard ? "★" : tile.letter;
    })
    .join("");
}

export function normalizeSelection(
  grid: Grid,
  selection: Position[]
): { valid: boolean; positions: Position[] } {
  if (selection.length === 0) {
    return { valid: false, positions: [] };
  }

  const row = selection[0].row;
  const uniqueCols = Array.from(new Set(selection.map((p) => p.col))).sort((a, b) => a - b);
  if (selection.some((p) => p.row !== row)) {
    return { valid: false, positions: [] };
  }

  for (let i = 1; i < uniqueCols.length; i++) {
    if (uniqueCols[i] !== uniqueCols[i - 1] + 1) {
      return { valid: false, positions: [] };
    }
  }

  const positions = uniqueCols.map((col) => ({ row, col }));
  for (const { row: r, col } of positions) {
    const tile = grid[r]?.[col];
    if (!tile || tile.kind !== "letter") {
      return { valid: false, positions: [] };
    }
  }

  return { valid: true, positions };
}

export function buildRangeSelection(
  grid: Grid,
  row: number,
  fromCol: number,
  toCol: number
): Position[] {
  const start = Math.min(fromCol, toCol);
  const end = Math.max(fromCol, toCol);
  const result: Position[] = [];

  for (let col = start; col <= end; col++) {
    const tile = grid[row]?.[col];
    if (!tile || tile.kind !== "letter") {
      return [];
    }
    result.push({ row, col });
  }
  return result;
}

export function rotateGrid(grid: Grid, direction: RotationDirection): Grid {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const rotated = createEmptyGrid(cols, rows);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (direction === "clockwise") {
        rotated[col][rows - 1 - row] = { ...grid[row][col] };
      } else {
        rotated[cols - 1 - col][row] = { ...grid[row][col] };
      }
    }
  }

  return rotated;
}

export function rotatePosition(
  position: Position,
  rowCount: number,
  colCount: number,
  direction: RotationDirection
): Position {
  if (direction === "clockwise") {
    return {
      row: position.col,
      col: rowCount - 1 - position.row
    };
  }

  return {
    row: colCount - 1 - position.col,
    col: position.row
  };
}

function didRowClear(beforeRow: Tile[], afterRow: Tile[]): boolean {
  if (!ROW_CLEAR_COUNTS_STONES && beforeRow.some((tile) => tile.kind === "stone")) {
    return false;
  }

  if (ROW_CLEAR_COUNTS_STONES) {
    return afterRow.every((tile) => tile.kind !== "letter");
  }
  return afterRow.every((tile) => tile.kind === "empty");
}

function resolveWildcardWord(pattern: string, dictionary: Set<string>): string | null {
  const upper = pattern.toUpperCase();
  const wildcardCount = [...upper].filter((ch) => ch === "*").length;
  if (wildcardCount === 0) {
    return dictionary.has(upper) ? upper : null;
  }
  if (wildcardCount > MAX_WILDCARDS_PER_WORD) {
    return null;
  }

  let best: string | null = null;
  const chars = upper.split("");
  const wildcardIdx: number[] = [];
  chars.forEach((ch, idx) => {
    if (ch === "*") wildcardIdx.push(idx);
  });

  const tryCandidate = (idx: number) => {
    if (idx >= wildcardIdx.length) {
      const candidate = chars.join("");
      if (dictionary.has(candidate)) {
        if (!best || scoreWord(candidate, wildcardCount, false) > scoreWord(best, wildcardCount, false)) {
          best = candidate;
        }
      }
      return;
    }

    for (let letterCode = 65; letterCode <= 90; letterCode++) {
      chars[wildcardIdx[idx]] = String.fromCharCode(letterCode);
      tryCandidate(idx + 1);
    }
    chars[wildcardIdx[idx]] = "*";
  };

  tryCandidate(0);
  return best;
}

function getSpawnCount(level: number, rng: RNG): number {
  const max = Math.min(SPAWN_MAX, SPAWN_MIN + Math.floor((level - 1) / 2));
  const min = Math.min(SPAWN_MIN, max);
  return min + rng.int(max - min + 1);
}

function createSpawnTile(rng: RNG, allowStone: boolean): Tile {
  if (!allowStone) {
    const letter = LETTER_DISTRIBUTION[rng.int(LETTER_DISTRIBUTION.length)];
    if (rng.int(100) < WILDCARD_TILE_WEIGHT) {
      return { kind: "letter", letter: "*", isWildcard: true };
    }
    return { kind: "letter", letter, isWildcard: false };
  }

  const weightTotal = LETTER_TILE_WEIGHT + WILDCARD_TILE_WEIGHT + STONE_TILE_WEIGHT;
  const roll = rng.int(weightTotal);

  if (roll < LETTER_TILE_WEIGHT) {
    const letter = LETTER_DISTRIBUTION[rng.int(LETTER_DISTRIBUTION.length)];
    return { kind: "letter", letter, isWildcard: false };
  }

  if (roll < LETTER_TILE_WEIGHT + WILDCARD_TILE_WEIGHT) {
    return { kind: "letter", letter: "*", isWildcard: true };
  }

  return { kind: "stone" };
}

export function hasHorizontalVowelRun(grid: Grid, maxRun = 2): boolean {
  for (const row of grid) {
    let run = 0;
    for (const tile of row) {
      if (isVowelTile(tile)) {
        run++;
        if (run > maxRun) {
          return true;
        }
        continue;
      }
      run = 0;
    }
  }
  return false;
}

export function enforceHorizontalVowelLimit(grid: Grid, rng: RNG, maxRun = 2): Grid {
  const next = cloneGrid(grid);

  for (let row = 0; row < next.length; row++) {
    let run = 0;
    for (let col = 0; col < next[row].length; col++) {
      const tile = next[row][col];
      if (!isVowelTile(tile)) {
        run = 0;
        continue;
      }

      run++;
      if (run > maxRun) {
        next[row][col] = { kind: "letter", letter: randomConsonant(rng), isWildcard: false };
        run = 0;
      }
    }
  }

  return next;
}

function refillEmptyCells(grid: Grid, rng: RNG, allowStone: boolean): Grid {
  const next = cloneGrid(grid);
  for (let row = 0; row < next.length; row++) {
    for (let col = 0; col < next[row].length; col++) {
      if (next[row][col].kind === "empty") {
        next[row][col] = createSpawnTile(rng, allowStone);
      }
    }
  }
  return next;
}

function chooseUniqueColumns(count: number, cols: number, rng: RNG): number[] {
  const pool = Array.from({ length: cols }, (_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, cols));
}

function getLevel(wordsCleared: number): number {
  return 1 + Math.floor(wordsCleared / 8);
}

function getTickMs(level: number): number {
  return Math.max(MIN_TICK_MS, BASE_TICK_MS - (level - 1) * TICK_DECAY_PER_LEVEL);
}

function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => row.map((tile) => ({ ...tile })));
}

function isVowelTile(tile: Tile): boolean {
  return tile.kind === "letter" && !tile.isWildcard && VOWELS.has(tile.letter.toUpperCase());
}

function randomConsonant(rng: RNG): string {
  return CONSONANT_DISTRIBUTION[rng.int(CONSONANT_DISTRIBUTION.length)];
}
