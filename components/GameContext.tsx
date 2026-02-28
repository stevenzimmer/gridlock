"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
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

type UiState = {
  selection: Position[];
  invalidSelection: Position[];
  markedInvalidSelection: Position[];
  clearingSelection: Position[];
  settlingEffects: Record<string, SettleEffect>;
  settleNonce: number;
  clearingRow: number | null;
  message: string | null;
  errorMessage: string;
  cursor: Position;
  rotating: boolean;
  rotationVisualAngle: number;
  rotationTransitioning: boolean;
  lastWord: string;
};

type UiAction =
  | { type: "patch"; patch: Partial<UiState> }
  | { type: "setSettlingEffects"; effects: Record<string, SettleEffect> }
  | { type: "clearSettlingEffects" };

const initialUiState: UiState = {
  selection: [],
  invalidSelection: [],
  markedInvalidSelection: [],
  clearingSelection: [],
  settlingEffects: {},
  settleNonce: 0,
  clearingRow: null,
  message: "Loading daily board...",
  errorMessage: "",
  cursor: { row: GRID_ROWS - 1, col: 0 },
  rotating: false,
  rotationVisualAngle: 0,
  rotationTransitioning: false,
  lastWord: ""
};

function uiReducer(state: UiState, action: UiAction): UiState {
  if (action.type === "patch") {
    return {
      ...state,
      ...action.patch
    };
  }

  if (action.type === "setSettlingEffects") {
    return {
      ...state,
      settlingEffects: action.effects,
      settleNonce: state.settleNonce + 1
    };
  }

  return {
    ...state,
    settlingEffects: {}
  };
}

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
  const [uiState, dispatchUi] = useReducer(uiReducer, initialUiState);
  const [loadingState, setLoadingState] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [completed, setCompleted] = useState(false);
  const userTimeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);

  const draggingRef = useRef(false);
  const anchorRef = useRef<Position | null>(null);
  const selectionRef = useRef<Position[]>([]);

  const disabled = loadingState || completed || !gameState || uiState.rotating;

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
      dispatchUi({
        type: "patch",
        patch: {
          markedInvalidSelection: [],
          clearingSelection: [],
          clearingRow: null,
          rotationVisualAngle: 0,
          rotationTransitioning: false,
          rotating: false,
          selection: [],
          invalidSelection: [],
          message: payload.completed ? "Daily run completed." : null
        }
      });
      dispatchUi({ type: "clearSettlingEffects" });
      selectionRef.current = [];
      anchorRef.current = null;
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
        dispatchUi({
          type: "patch",
          patch: { message: error instanceof Error ? error.message : "Failed to load daily board." }
        });
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
      dispatchUi({
        type: "patch",
        patch: { message: "Use 3-40 chars: letters, numbers, '.', '_' or '-'." }
      });
      return;
    }

    if (normalized === (username ?? "")) {
      return;
    }

    setSavingUsername(true);
    dispatchUi({ type: "patch", patch: { errorMessage: "" } });
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
      dispatchUi({
        type: "patch",
        patch: {
          message: payload.username ? `Username updated: ${payload.username}` : "Username cleared."
        }
      });
    } catch (error) {
      dispatchUi({
        type: "patch",
        patch: { errorMessage: error instanceof Error ? error.message : "Failed to update username." }
      });
    } finally {
      setSavingUsername(false);
    }
  }, [playerId, username, usernameDraft]);

  const selectedDisplay = useMemo(() => {
    if (!gameState) {
      return "";
    }
    return selectionToDisplay(gameState.grid, uiState.selection);
  }, [gameState, uiState.selection]);

  const canSubmitSelection = useMemo(() => {
    if (!gameState) {
      return false;
    }
    return (
      normalizeSelection(gameState.grid, uiState.selection).valid &&
      uiState.selection.length >= MIN_WORD_LENGTH
    );
  }, [gameState, uiState.selection]);

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
          dispatchUi({
            type: "patch",
            patch: {
              clearingSelection: activeSelection,
              clearingRow: rowCanFlash ? row : null
            }
          });
          await delay(CLEAR_ANIMATION_MS);
        }

        const matchedWord = /^Cleared\s+([A-Z]+)/.exec(payload.message || "");
        const nextMarkedInvalidSelection = pruneMarkedInvalidPositions(
          uiState.markedInvalidSelection,
          gridBeforeSubmit,
          activeSelection,
          payload.state.grid
        );
        const settleEffects = getSettleEffects(gridBeforeSubmit, payload.state.grid, activeSelection);

        setGameState(payload.state);
        setCompleted(payload.completed);
        dispatchUi({
          type: "patch",
          patch: {
            clearingSelection: [],
            clearingRow: null,
            message: payload.message,
            invalidSelection: [],
            markedInvalidSelection: nextMarkedInvalidSelection,
            selection: [],
            lastWord: matchedWord?.[1] ?? uiState.lastWord
          }
        });
        dispatchUi({
          type: "setSettlingEffects",
          effects: settleEffects
        });
        shouldRunSettleAnimation = true;
        selectionRef.current = [];
        anchorRef.current = null;
      } else {
        const nextMarkedInvalidSelection = dedupePositions([
          ...uiState.markedInvalidSelection,
          ...activeSelection
        ]);
        setGameState(payload.state);
        setCompleted(payload.completed);
        dispatchUi({
          type: "patch",
          patch: {
            message: !payload.accepted && payload.message.startsWith("Invalid word.") ? null : payload.message,
            invalidSelection: activeSelection,
            markedInvalidSelection: nextMarkedInvalidSelection
          }
        });
      }
    } catch (error) {
      dispatchUi({
        type: "patch",
        patch: { message: error instanceof Error ? error.message : "Failed to submit selection." }
      });
    } finally {
      setSubmitting(false);
      if (shouldRunSettleAnimation) {
        window.setTimeout(() => {
          dispatchUi({ type: "clearSettlingEffects" });
        }, SETTLE_ANIMATION_MS);
      }
    }
  }, [disabled, gameState, playerId, submitting, uiState.lastWord, uiState.markedInvalidSelection, userTimeZone]);

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
          dispatchUi({
            type: "patch",
            patch: {
              clearingSelection: [{ row, col }]
            }
          });
          await delay(CLEAR_ANIMATION_MS);
          dispatchUi({
            type: "patch",
            patch: {
              clearingSelection: []
            }
          });
        }
        setGameState(payload.state);
        setCompleted(payload.completed);
        if (payload.accepted) {
          dispatchUi({
            type: "setSettlingEffects",
            effects: getSettleEffects(gridBeforePunchout, payload.state.grid, [{ row, col }])
          });
          shouldRunSettleAnimation = true;
        }
        dispatchUi({
          type: "patch",
          patch: {
            message: payload.message,
            selection: [],
            invalidSelection: [],
            markedInvalidSelection: pruneMarkedInvalidPositions(
              uiState.markedInvalidSelection,
              gridBeforePunchout,
              [{ row, col }],
              payload.state.grid
            ),
            cursor: { row, col }
          }
        });
        selectionRef.current = [];
        anchorRef.current = null;
        draggingRef.current = false;
      } catch (error) {
        dispatchUi({
          type: "patch",
          patch: { message: error instanceof Error ? error.message : "Failed to use punchout." }
        });
      } finally {
        setSubmitting(false);
        if (shouldRunSettleAnimation) {
          window.setTimeout(() => {
            dispatchUi({ type: "clearSettlingEffects" });
          }, SETTLE_ANIMATION_MS);
        }
      }
    },
    [disabled, gameState, playerId, submitting, uiState.markedInvalidSelection, userTimeZone]
  );

  const runRotate = useCallback(
    async (direction: RotationDirection) => {
      if (!gameState || disabled || submitting || uiState.rotating) {
        return;
      }

      const rowCount = gameState.grid.length;
      const colCount = gameState.grid[0]?.length ?? 0;
      const angle = direction === "clockwise" ? 90 : -90;

      dispatchUi({
        type: "patch",
        patch: {
          rotating: true,
          rotationTransitioning: true,
          rotationVisualAngle: angle,
          selection: [],
          invalidSelection: [],
          markedInvalidSelection: [],
          message: null
        }
      });
      selectionRef.current = [];
      anchorRef.current = null;
      draggingRef.current = false;

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
      dispatchUi({
        type: "patch",
        patch: {
          cursor: rotatePosition(uiState.cursor, rowCount, colCount, direction),
          rotationTransitioning: false,
          rotationVisualAngle: 0
        }
      });

      try {
        const response = await requestPromise;
        const payload = (await response.json()) as SubmitPayload | { error: string };
        if (!response.ok || "error" in payload) {
          throw new Error((payload as { error: string }).error || "Rotate failed");
        }
        setDateKey(payload.dateKey);
        setGameState(payload.state);
        setCompleted(payload.completed);
        dispatchUi({
          type: "patch",
          patch: { message: payload.message }
        });
      } catch (error) {
        dispatchUi({
          type: "patch",
          patch: { message: error instanceof Error ? error.message : "Failed to rotate board." }
        });
        try {
          await loadStateForPlayer(playerId);
        } catch (reloadError) {
          dispatchUi({
            type: "patch",
            patch: {
              errorMessage:
                reloadError instanceof Error
                  ? reloadError.message
                  : "Failed to reload board after rotate error."
            }
          });
        }
      } finally {
        dispatchUi({
          type: "patch",
          patch: { rotating: false }
        });
      }
    },
    [disabled, gameState, loadStateForPlayer, playerId, submitting, uiState.cursor, uiState.rotating, userTimeZone]
  );

  const onCellPointerDown = useCallback(
    (row: number, col: number) => {
      if (!gameState || disabled) {
        return;
      }

      const tile = gameState.grid[row][col];
      if (tile.kind !== "letter") {
        dispatchUi({
          type: "patch",
          patch: {
            selection: [],
            invalidSelection: []
          }
        });
        selectionRef.current = [];
        anchorRef.current = null;
        return;
      }

      draggingRef.current = true;
      anchorRef.current = { row, col };
      dispatchUi({
        type: "patch",
        patch: {
          selection: [{ row, col }],
          invalidSelection: [],
          cursor: { row, col },
          message: null
        }
      });
      selectionRef.current = [{ row, col }];
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

      dispatchUi({
        type: "patch",
        patch: {
          selection: nextRange,
          invalidSelection: [],
          cursor: { row, col }
        }
      });
      selectionRef.current = nextRange;
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
        dispatchUi({
          type: "patch",
          patch: {
            cursor: { ...uiState.cursor, col: Math.max(0, uiState.cursor.col - 1) }
          }
        });
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        dispatchUi({
          type: "patch",
          patch: {
            cursor: { ...uiState.cursor, col: Math.min(GRID_COLS - 1, uiState.cursor.col + 1) }
          }
        });
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        dispatchUi({
          type: "patch",
          patch: {
            cursor: { ...uiState.cursor, row: Math.max(0, uiState.cursor.row - 1) }
          }
        });
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        dispatchUi({
          type: "patch",
          patch: {
            cursor: { ...uiState.cursor, row: Math.min(GRID_ROWS - 1, uiState.cursor.row + 1) }
          }
        });
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        dispatchUi({
          type: "patch",
          patch: {
            selection: [],
            invalidSelection: []
          }
        });
        selectionRef.current = [];
        anchorRef.current = null;
        return;
      }
      if (event.key === " ") {
        event.preventDefault();
        const tile = gameState.grid[uiState.cursor.row][uiState.cursor.col];
        if (tile.kind !== "letter") {
          return;
        }

        if (!anchorRef.current || anchorRef.current.row !== uiState.cursor.row) {
          anchorRef.current = { ...uiState.cursor };
          dispatchUi({
            type: "patch",
            patch: {
              selection: [{ ...uiState.cursor }],
              invalidSelection: []
            }
          });
          selectionRef.current = [{ ...uiState.cursor }];
          return;
        }

        const rangeStart = Math.min(anchorRef.current.col, uiState.cursor.col);
        const rangeEnd = Math.max(anchorRef.current.col, uiState.cursor.col);
        const nextRange: Position[] = [];

        for (let col = rangeStart; col <= rangeEnd; col++) {
          const nextTile = gameState.grid[uiState.cursor.row][col];
          if (nextTile.kind !== "letter") {
            return;
          }
          nextRange.push({ row: uiState.cursor.row, col });
        }

        dispatchUi({
          type: "patch",
          patch: {
            selection: nextRange,
            invalidSelection: []
          }
        });
        selectionRef.current = nextRange;
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        void runSubmit();
      }
    },
    [disabled, gameState, runSubmit, uiState.cursor]
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
    lastWord: uiState.lastWord,
    loading: loadingState || submitting || uiState.rotating,
    disabled: disabled || Boolean(gameState?.gameOver),
    gameOver: Boolean(gameState?.gameOver),
    selectedDisplay,
    canSubmitSelection,
    message: uiState.message,
    errorMessage: uiState.errorMessage,
    savingUsername,
    grid: gameState?.grid ?? null,
    selection: uiState.selection,
    invalidSelection: uiState.invalidSelection,
    markedInvalidSelection: uiState.markedInvalidSelection,
    clearingSelection: uiState.clearingSelection,
    settlingEffects: uiState.settlingEffects,
    settleNonce: uiState.settleNonce,
    clearingRow: uiState.clearingRow,
    cursor: uiState.cursor,
    rotating: uiState.rotating,
    rotationVisualAngle: uiState.rotationVisualAngle,
    rotationTransitioning: uiState.rotationTransitioning,
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
