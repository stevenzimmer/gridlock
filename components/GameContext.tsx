"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { GRID_COLS, GRID_ROWS, MIN_WORD_LENGTH } from "@/lib/config";
import { dedupePositions, pruneMarkedInvalidPositions } from "@/lib/positions";
import { getOrCreatePlayerId, isValidPlayerId, PLAYER_ID_STORAGE_KEY } from "@/lib/player-id";
import { normalizeSelection, rotateGrid, rotatePosition, selectionToDisplay } from "@/lib/game";
import { isValidUsername, normalizeUsername } from "@/lib/username";
import type { GameState, Position, ProfilePayload, RotationDirection, StatePayload, SubmitPayload } from "@/lib/types";

type SettleEffect = {
  dropRows: number;
  spawned: boolean;
};

type GameContextValue = {
  playerId: string;
  playerDisplayName: string;
  hasUsername: boolean;
  usernameDraft: string;
  score: number;
  level: number;
  wordsCleared: number;
  longestWord: string;
  punchoutsRemaining: number;
  invalidWordsSubmitted: number;
  dateKey: string;
  completed: boolean;
  lastWord: string;
  loading: boolean;
  disabled: boolean;
  gameOver: boolean;
  selectedDisplay: string;
  canSubmitSelection: boolean;
  message: string | null;
  errorMessage: string;
  savingUsername: boolean;
  grid: GameState["grid"] | null;
  selection: Position[];
  invalidSelection: Position[];
  markedInvalidSelection: Position[];
  clearingSelection: Position[];
  settlingEffects: Record<string, SettleEffect>;
  settleNonce: number;
  clearingRow: number | null;
  cursor: Position;
  rotating: boolean;
  rotationVisualAngle: number;
  rotationTransitioning: boolean;
  setUsernameDraft: (value: string) => void;
  submitSelection: () => Promise<void>;
  rotateClockwise: () => Promise<void>;
  rotateCounterclockwise: () => Promise<void>;
  updateUsername: () => Promise<void>;
  onCellPointerDown: (row: number, col: number) => void;
  onCellPointerEnter: (row: number, col: number) => void;
  onCellPointerUp: () => void;
  onCellDoubleClick: (row: number, col: number) => Promise<void>;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
};

const GameContext = createContext<GameContextValue | null>(null);

const CLEAR_ANIMATION_MS = 220;
const SETTLE_ANIMATION_MS = 260;
const ROTATE_ANIMATION_MS = 420;

export function GameProvider({ children }: { children: ReactNode }) {
  const [playerId, setPlayerId] = useState<string>("");
  const [username, setUsername] = useState<string | null>(null);
  const [usernameDraft, setUsernameDraft] = useState<string>("");
  const [dateKey, setDateKey] = useState<string>("");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selection, setSelection] = useState<Position[]>([]);
  const [invalidSelection, setInvalidSelection] = useState<Position[]>([]);
  const [markedInvalidSelection, setMarkedInvalidSelection] = useState<Position[]>([]);
  const [clearingSelection, setClearingSelection] = useState<Position[]>([]);
  const [settlingEffects, setSettlingEffects] = useState<Record<string, SettleEffect>>({});
  const [settleNonce, setSettleNonce] = useState(0);
  const [clearingRow, setClearingRow] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>("Loading daily board...");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [cursor, setCursor] = useState<Position>({ row: GRID_ROWS - 1, col: 0 });
  const [rotating, setRotating] = useState(false);
  const [rotationVisualAngle, setRotationVisualAngle] = useState(0);
  const [rotationTransitioning, setRotationTransitioning] = useState(false);
  const [lastWord, setLastWord] = useState<string>("");
  const [loadingState, setLoadingState] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [completed, setCompleted] = useState(false);
  const userTimeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);

  const draggingRef = useRef(false);
  const anchorRef = useRef<Position | null>(null);
  const selectionRef = useRef<Position[]>([]);

  const disabled = loadingState || completed || !gameState || rotating;

  const loadStateForPlayer = useCallback(
    async (pid: string) => {
      const response = await fetch(
        `/api/game/state?playerId=${encodeURIComponent(pid)}&timeZone=${encodeURIComponent(userTimeZone)}`
      );
      const payload = (await response.json()) as StatePayload | { error: string };
      if (!response.ok || "error" in payload) {
        throw new Error((payload as { error: string }).error || "Failed to load game state");
      }

      setDateKey(payload.dateKey);
      setGameState(payload.state);
      setCompleted(payload.completed);
      setUsername(payload.username ?? null);
      setUsernameDraft(payload.username ?? "");
      setMarkedInvalidSelection([]);
      setClearingSelection([]);
      setSettlingEffects({});
      setClearingRow(null);
      setRotationVisualAngle(0);
      setRotationTransitioning(false);
      setRotating(false);
      setSelection([]);
      setInvalidSelection([]);
      selectionRef.current = [];
      anchorRef.current = null;
      setMessage(payload.completed ? "Daily run completed." : null);
    },
    [userTimeZone]
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const stored = getOrCreatePlayerId();
        const pid = isValidPlayerId(stored) ? stored : crypto.randomUUID();
        if (pid !== stored) {
          localStorage.setItem(PLAYER_ID_STORAGE_KEY, pid);
        }
        if (!active) {
          return;
        }
        setPlayerId(pid);

        if (!active) {
          return;
        }
        await loadStateForPlayer(pid);
      } catch (error) {
        if (!active) {
          return;
        }
        setMessage(error instanceof Error ? error.message : "Failed to load daily board.");
      } finally {
        if (active) {
          setLoadingState(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [loadStateForPlayer]);

  const updateUsername = useCallback(async () => {
    const normalized = normalizeUsername(usernameDraft);
    if (normalized.length > 0 && !isValidUsername(normalized)) {
      setMessage("Use 3-40 chars: letters, numbers, '.', '_' or '-'.");
      return;
    }

    if (normalized === (username ?? "")) {
      return;
    }

    setSavingUsername(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/player/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          playerId,
          username: normalized
        })
      });

      const payload = (await response.json()) as ProfilePayload | { error: string };
      if (!response.ok || "error" in payload) {
        throw new Error((payload as { error: string }).error || "Failed to update username.");
      }

      setUsername(payload.username);
      setUsernameDraft(payload.username ?? "");
      setMessage(payload.username ? `Username updated: ${payload.username}` : "Username cleared.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update username.");
    } finally {
      setSavingUsername(false);
    }
  }, [playerId, username, usernameDraft]);

  const selectedDisplay = useMemo(() => {
    if (!gameState) {
      return "";
    }
    return selectionToDisplay(gameState.grid, selection);
  }, [gameState, selection]);

  const canSubmitSelection = useMemo(() => {
    if (!gameState) {
      return false;
    }
    return normalizeSelection(gameState.grid, selection).valid && selection.length >= MIN_WORD_LENGTH;
  }, [gameState, selection]);

  const runSubmit = useCallback(async () => {
    if (!gameState || disabled || submitting) {
      return;
    }

    const activeSelection = selectionRef.current;
    if (!activeSelection.length) {
      return;
    }

    setSubmitting(true);
    const gridBeforeSubmit = gameState.grid;
    let shouldRunSettleAnimation = false;
    try {
      const response = await fetch("/api/game/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          playerId,
          selection: activeSelection,
          timeZone: userTimeZone
        })
      });

      const payload = (await response.json()) as SubmitPayload | { error: string };
      if (!response.ok || "error" in payload) {
        throw new Error((payload as { error: string }).error || "Submit failed");
      }

      setDateKey(payload.dateKey);

      if (payload.accepted) {
        const row = activeSelection[0]?.row ?? null;
        const rowCanFlash =
          row !== null &&
          row >= 0 &&
          row < gridBeforeSubmit.length &&
          gridBeforeSubmit[row].every((tile) => tile.kind !== "stone") &&
          activeSelection.length === gridBeforeSubmit[row].length;

        if (activeSelection.length > 0) {
          setClearingSelection(activeSelection);
          setClearingRow(rowCanFlash ? row : null);
          await delay(CLEAR_ANIMATION_MS);
        }

        setClearingSelection([]);
        setClearingRow(null);
        setGameState(payload.state);
        setCompleted(payload.completed);
        setMessage(payload.message);
        setInvalidSelection([]);
        setMarkedInvalidSelection((previousMarked) =>
          pruneMarkedInvalidPositions(previousMarked, gridBeforeSubmit, activeSelection, payload.state.grid)
        );
        const matchedWord = /^Cleared\s+([A-Z]+)/.exec(payload.message || "");
        if (matchedWord?.[1]) {
          setLastWord(matchedWord[1]);
        }
        setSettlingEffects(getSettleEffects(gridBeforeSubmit, payload.state.grid, activeSelection));
        setSettleNonce((value) => value + 1);
        shouldRunSettleAnimation = true;
        selectionRef.current = [];
        setSelection([]);
        anchorRef.current = null;
      } else {
        setGameState(payload.state);
        setCompleted(payload.completed);
        if (!payload.accepted && payload.message.startsWith("Invalid word.")) {
          setMessage(null);
        } else {
          setMessage(payload.message);
        }
        setInvalidSelection(activeSelection);
        setMarkedInvalidSelection((previousMarked) => dedupePositions([...previousMarked, ...activeSelection]));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to submit selection.");
    } finally {
      setSubmitting(false);
      if (shouldRunSettleAnimation) {
        window.setTimeout(() => {
          setSettlingEffects({});
        }, SETTLE_ANIMATION_MS);
      }
    }
  }, [disabled, gameState, playerId, submitting, userTimeZone]);

  const runPunchout = useCallback(
    async (row: number, col: number) => {
      if (!gameState || disabled || submitting) {
        return;
      }

      setSubmitting(true);
      const gridBeforePunchout = gameState.grid;
      let shouldRunSettleAnimation = false;
      try {
        const response = await fetch("/api/game/punchout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            playerId,
            position: { row, col },
            timeZone: userTimeZone
          })
        });

        const payload = (await response.json()) as SubmitPayload | { error: string };
        if (!response.ok || "error" in payload) {
          throw new Error((payload as { error: string }).error || "Punchout failed");
        }

        setDateKey(payload.dateKey);
        if (payload.accepted) {
          setClearingSelection([{ row, col }]);
          await delay(CLEAR_ANIMATION_MS);
          setClearingSelection([]);
        }
        setGameState(payload.state);
        setCompleted(payload.completed);
        setMessage(payload.message);
        if (payload.accepted) {
          setSettlingEffects(getSettleEffects(gridBeforePunchout, payload.state.grid, [{ row, col }]));
          setSettleNonce((value) => value + 1);
          shouldRunSettleAnimation = true;
        }
        setSelection([]);
        setInvalidSelection([]);
        setMarkedInvalidSelection((previousMarked) =>
          pruneMarkedInvalidPositions(previousMarked, gridBeforePunchout, [{ row, col }], payload.state.grid)
        );
        selectionRef.current = [];
        anchorRef.current = null;
        draggingRef.current = false;
        setCursor({ row, col });
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to use punchout.");
      } finally {
        setSubmitting(false);
        if (shouldRunSettleAnimation) {
          window.setTimeout(() => {
            setSettlingEffects({});
          }, SETTLE_ANIMATION_MS);
        }
      }
    },
    [disabled, gameState, playerId, submitting, userTimeZone]
  );

  const runRotate = useCallback(
    async (direction: RotationDirection) => {
      if (!gameState || disabled || submitting || rotating) {
        return;
      }

      const rowCount = gameState.grid.length;
      const colCount = gameState.grid[0]?.length ?? 0;
      const angle = direction === "clockwise" ? 90 : -90;

      setRotating(true);
      setRotationTransitioning(true);
      setRotationVisualAngle(angle);
      setSelection([]);
      setInvalidSelection([]);
      setMarkedInvalidSelection([]);
      selectionRef.current = [];
      anchorRef.current = null;
      draggingRef.current = false;
      setMessage(null);

      const requestPromise = fetch("/api/game/rotate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          playerId,
          direction,
          timeZone: userTimeZone
        })
      });

      await delay(ROTATE_ANIMATION_MS);
      setGameState((previous) =>
        previous
          ? {
              ...previous,
              grid: rotateGrid(previous.grid, direction)
            }
          : previous
      );
      setCursor((previous) => rotatePosition(previous, rowCount, colCount, direction));
      setRotationTransitioning(false);
      setRotationVisualAngle(0);

      try {
        const response = await requestPromise;
        const payload = (await response.json()) as SubmitPayload | { error: string };
        if (!response.ok || "error" in payload) {
          throw new Error((payload as { error: string }).error || "Rotate failed");
        }
        setDateKey(payload.dateKey);
        setGameState(payload.state);
        setCompleted(payload.completed);
        setMessage(payload.message);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to rotate board.");
        try {
          await loadStateForPlayer(playerId);
        } catch (reloadError) {
          setErrorMessage(
            reloadError instanceof Error
              ? reloadError.message
              : "Failed to reload board after rotate error."
          );
        }
      } finally {
        setRotating(false);
      }
    },
    [disabled, gameState, loadStateForPlayer, playerId, rotating, submitting, userTimeZone]
  );

  const onCellPointerDown = useCallback(
    (row: number, col: number) => {
      if (!gameState || disabled) {
        return;
      }

      const tile = gameState.grid[row][col];
      if (tile.kind !== "letter") {
        setSelection([]);
        setInvalidSelection([]);
        selectionRef.current = [];
        anchorRef.current = null;
        return;
      }

      draggingRef.current = true;
      anchorRef.current = { row, col };
      setSelection([{ row, col }]);
      setInvalidSelection([]);
      selectionRef.current = [{ row, col }];
      setCursor({ row, col });
      setMessage(null);
    },
    [disabled, gameState]
  );

  const onCellPointerEnter = useCallback(
    (row: number, col: number) => {
      if (!gameState || disabled || !draggingRef.current || !anchorRef.current) {
        return;
      }

      const anchor = anchorRef.current;
      if (row !== anchor.row) {
        return;
      }

      const rangeStart = Math.min(anchor.col, col);
      const rangeEnd = Math.max(anchor.col, col);
      const nextRange: Position[] = [];

      for (let c = rangeStart; c <= rangeEnd; c++) {
        const tile = gameState.grid[row][c];
        if (tile.kind !== "letter") {
          return;
        }
        nextRange.push({ row, col: c });
      }

      setSelection(nextRange);
      setInvalidSelection([]);
      selectionRef.current = nextRange;
      setCursor({ row, col });
    },
    [disabled, gameState]
  );

  const onCellPointerUp = useCallback(() => {
    if (!draggingRef.current) {
      return;
    }
    draggingRef.current = false;
    anchorRef.current = null;
    if (selectionRef.current.length >= MIN_WORD_LENGTH) {
      void runSubmit();
    }
  }, [runSubmit]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!gameState || disabled) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setCursor((pos) => ({ ...pos, col: Math.max(0, pos.col - 1) }));
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setCursor((pos) => ({ ...pos, col: Math.min(GRID_COLS - 1, pos.col + 1) }));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setCursor((pos) => ({ ...pos, row: Math.max(0, pos.row - 1) }));
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setCursor((pos) => ({ ...pos, row: Math.min(GRID_ROWS - 1, pos.row + 1) }));
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setSelection([]);
        setInvalidSelection([]);
        selectionRef.current = [];
        anchorRef.current = null;
        return;
      }
      if (event.key === " ") {
        event.preventDefault();
        const tile = gameState.grid[cursor.row][cursor.col];
        if (tile.kind !== "letter") {
          return;
        }

        if (!anchorRef.current || anchorRef.current.row !== cursor.row) {
          anchorRef.current = { ...cursor };
          setSelection([{ ...cursor }]);
          setInvalidSelection([]);
          selectionRef.current = [{ ...cursor }];
          return;
        }

        const rangeStart = Math.min(anchorRef.current.col, cursor.col);
        const rangeEnd = Math.max(anchorRef.current.col, cursor.col);
        const nextRange: Position[] = [];

        for (let col = rangeStart; col <= rangeEnd; col++) {
          const nextTile = gameState.grid[cursor.row][col];
          if (nextTile.kind !== "letter") {
            return;
          }
          nextRange.push({ row: cursor.row, col });
        }

        setSelection(nextRange);
        setInvalidSelection([]);
        selectionRef.current = nextRange;
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        void runSubmit();
      }
    },
    [cursor, disabled, gameState, runSubmit]
  );

  const value: GameContextValue = {
    playerId,
    playerDisplayName: username ?? playerId,
    hasUsername: Boolean(username),
    usernameDraft,
    score: gameState?.score ?? 0,
    level: gameState?.level ?? 1,
    wordsCleared: gameState?.stats.wordsCleared ?? 0,
    longestWord: gameState?.stats.longestWord ?? "",
    punchoutsRemaining: gameState?.punchoutsRemaining ?? 3,
    invalidWordsSubmitted: gameState?.invalidWordsSubmitted ?? 0,
    dateKey,
    completed,
    lastWord,
    loading: loadingState || submitting || rotating,
    disabled: disabled || Boolean(gameState?.gameOver),
    gameOver: Boolean(gameState?.gameOver),
    selectedDisplay,
    canSubmitSelection,
    message,
    errorMessage,
    savingUsername,
    grid: gameState?.grid ?? null,
    selection,
    invalidSelection,
    markedInvalidSelection,
    clearingSelection,
    settlingEffects,
    settleNonce,
    clearingRow,
    cursor,
    rotating,
    rotationVisualAngle,
    rotationTransitioning,
    setUsernameDraft,
    submitSelection: runSubmit,
    rotateClockwise: () => runRotate("clockwise"),
    rotateCounterclockwise: () => runRotate("counterclockwise"),
    updateUsername,
    onCellPointerDown,
    onCellPointerEnter,
    onCellPointerUp,
    onCellDoubleClick: runPunchout,
    onKeyDown
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function getSettleEffects(
  before: GameState["grid"],
  after: GameState["grid"],
  removed: Position[]
): Record<string, SettleEffect> {
  const effects: Record<string, SettleEffect> = {};
  const rows = after.length;
  const cols = after[0]?.length ?? 0;

  const removedByCol = new Map<number, Set<number>>();
  for (const position of removed) {
    if (!removedByCol.has(position.col)) {
      removedByCol.set(position.col, new Set<number>());
    }
    removedByCol.get(position.col)?.add(position.row);
  }

  for (let col = 0; col < cols; col++) {
    const removedRows = removedByCol.get(col) ?? new Set<number>();
    let segmentTop = 0;

    while (segmentTop < rows) {
      let segmentBottom = segmentTop;
      while (segmentBottom < rows && before[segmentBottom][col].kind !== "stone") {
        segmentBottom++;
      }

      const remainingBeforeRows: number[] = [];
      const afterRows: number[] = [];

      for (let row = segmentTop; row < segmentBottom; row++) {
        if (before[row][col].kind === "letter" && !removedRows.has(row)) {
          remainingBeforeRows.push(row);
        }
        if (after[row][col].kind === "letter") {
          afterRows.push(row);
        }
      }

      const existingCount = Math.min(remainingBeforeRows.length, afterRows.length);
      const targetRowsForExisting = afterRows.slice(afterRows.length - existingCount);

      for (let i = 0; i < existingCount; i++) {
        const sourceRow = remainingBeforeRows[i];
        const targetRow = targetRowsForExisting[i];
        const dropRows = targetRow - sourceRow;
        if (dropRows > 0) {
          effects[`${targetRow}:${col}`] = {
            dropRows,
            spawned: false
          };
        }
      }

      const spawnCount = afterRows.length - existingCount;
      for (let i = 0; i < spawnCount; i++) {
        const targetRow = afterRows[i];
        effects[`${targetRow}:${col}`] = {
          dropRows: Math.max(1, targetRow - segmentTop + 1),
          spawned: true
        };
      }

      segmentTop = segmentBottom + 1;
    }
  }

  return effects;
}

export function useGameContext() {
  const value = useContext(GameContext);
  if (!value) {
    throw new Error("useGameContext must be used within GameProvider");
  }
  return value;
}
