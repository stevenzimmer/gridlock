"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { normalizeSelection, selectionToDisplay } from "@/lib/game";
import { isValidPlayerId } from "@/lib/player-id";
import { isValidUsername, normalizeUsername } from "@/lib/username";
import type { GameState, Position, StatePayload, SubmitPayload, ProfilePayload } from "@/lib/types";
import { dedupePositions, pruneMarkedInvalidPositions } from "@/lib/positions";
import { GRID_COLS, GRID_ROWS, MIN_WORD_LENGTH } from "@/lib/config";
import { GridView } from "@/components/GridView";
import { HUD } from "@/components/HUD";

const PLAYER_ID_STORAGE_KEY = "gravity-grid-player-id";




function getOrCreatePlayerId(): string {
  const existing = localStorage.getItem(PLAYER_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const created = crypto.randomUUID();
  localStorage.setItem(PLAYER_ID_STORAGE_KEY, created);
  return created;
}


export function Game() {
  const [playerId, setPlayerId] = useState<string>("");
  const [username, setUsername] = useState<string | null>(null);
  const [usernameDraft, setUsernameDraft] = useState<string>("");
  const [dateKey, setDateKey] = useState<string>("");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selection, setSelection] = useState<Position[]>([]);
  const [invalidSelection, setInvalidSelection] = useState<Position[]>([]);
  const [markedInvalidSelection, setMarkedInvalidSelection] = useState<Position[]>([]);
  const [message, setMessage] = useState<string | null>("Loading daily board...");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [cursor, setCursor] = useState<Position>({ row: GRID_ROWS - 1, col: 0 });
  const [lastWord, setLastWord] = useState<string>("");
  const [loadingState, setLoadingState] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);


  const draggingRef = useRef(false);
  const anchorRef = useRef<Position | null>(null);
  const selectionRef = useRef<Position[]>([]);

  const disabled = loadingState || submitting || completed || !gameState;

  const loadStateForPlayer = useCallback(async (pid: string) => {
    const response = await fetch(`/api/game/state?playerId=${encodeURIComponent(pid)}`);
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
    setSelection([]);
    setInvalidSelection([]);
    selectionRef.current = [];
    anchorRef.current = null;
    setMessage(payload.completed ? "Daily run completed." : null);
  }, []);

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

  const updateUsername = async () => {
    const normalized = normalizeUsername(usernameDraft);
    if (normalized.length > 0 && !isValidUsername(normalized)) {
      setMessage("Use 3-40 chars: letters, numbers, '.', '_' or '-'.");
      return;
    }

    if (normalized === (username ?? "")) {
      return;
    }

    setSavingUsername(true);
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
  };

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

  const runSubmit = async () => {
    if (!gameState || disabled) {
      return;
    }

    const activeSelection = selectionRef.current;
    if (!activeSelection.length) {
      return;
    }

    setSubmitting(true);
    const gridBeforeSubmit = gameState.grid;
    try {
      const response = await fetch("/api/game/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          playerId,
          selection: activeSelection
        })
      });

      const payload = (await response.json()) as SubmitPayload | { error: string };
      if (!response.ok || "error" in payload) {
        throw new Error((payload as { error: string }).error || "Submit failed");
      }

      setDateKey(payload.dateKey);
      setGameState(payload.state);
      setCompleted(payload.completed);
      if (!payload.accepted && payload.message.startsWith("Invalid word.")) {
        setMessage(null);
      } else {
        setMessage(payload.message);
      }

      if (payload.accepted) {
        setInvalidSelection([]);
        setMarkedInvalidSelection((previousMarked) =>
          pruneMarkedInvalidPositions(
            previousMarked,
            gridBeforeSubmit,
            activeSelection,
            payload.state.grid
          )
        );
        const matchedWord = /^Cleared\s+([A-Z]+)/.exec(payload.message || "");
        if (matchedWord?.[1]) {
          setLastWord(matchedWord[1]);
        }
        selectionRef.current = [];
        setSelection([]);
        anchorRef.current = null;
      } else {
        setInvalidSelection(activeSelection);
        setMarkedInvalidSelection((previousMarked) =>
          dedupePositions([...previousMarked, ...activeSelection])
        );
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to submit selection.");
    } finally {
      setSubmitting(false);
    }
  };

  const runPunchout = async (row: number, col: number) => {
    if (!gameState || disabled) {
      return;
    }

    setSubmitting(true);
    const gridBeforePunchout = gameState.grid;
    try {
      const response = await fetch("/api/game/punchout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          playerId,
          position: { row, col }
        })
      });

      const payload = (await response.json()) as SubmitPayload | { error: string };
      if (!response.ok || "error" in payload) {
        throw new Error((payload as { error: string }).error || "Punchout failed");
      }

      setDateKey(payload.dateKey);
      setGameState(payload.state);
      setCompleted(payload.completed);
      setMessage(payload.message);
      setSelection([]);
      setInvalidSelection([]);
      setMarkedInvalidSelection((previousMarked) =>
        pruneMarkedInvalidPositions(
          previousMarked,
          gridBeforePunchout,
          [{ row, col }],
          payload.state.grid
        )
      );
      selectionRef.current = [];
      anchorRef.current = null;
      draggingRef.current = false;
      setCursor({ row, col });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to use punchout.");
    } finally {
      setSubmitting(false);
    }
  };

  const onCellPointerDown = (row: number, col: number) => {
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
  };

  const onCellPointerEnter = (row: number, col: number) => {
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
  };

  const onCellPointerUp = () => {
    if (!draggingRef.current) {
      return;
    }
    draggingRef.current = false;
    anchorRef.current = null;
    if (selectionRef.current.length >= MIN_WORD_LENGTH) {
      void runSubmit();
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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
  };

  const sidePanel = (
    <>
      <HUD
        playerId={playerId}
        playerDisplayName={username ?? playerId}
        hasUsername={Boolean(username)}
        usernameDraft={usernameDraft}
        score={gameState?.score ?? 0}
        level={gameState?.level ?? 1}
        wordsCleared={gameState?.stats.wordsCleared ?? 0}
        longestWord={gameState?.stats.longestWord ?? ""}
        punchoutsRemaining={gameState?.punchoutsRemaining ?? 3}
        invalidWordsSubmitted={gameState?.invalidWordsSubmitted ?? 0}
        dateKey={dateKey}
        completed={completed}
        loading={loadingState || submitting}
        selectedDisplay={selectedDisplay}
        canSubmitSelection={canSubmitSelection}
        message={message}
        errorMessage={errorMessage}
        savingUsername={savingUsername}
        onUsernameDraftChange={setUsernameDraft}
        lastWord={lastWord}
        onUsernameSave={() => {
          void updateUsername();
        }}
        onSubmitSelection={() => {
          void runSubmit();
        }}
      />
    </>
  );

  return (
    <section className="relative mx-auto w-full max-w-6xl">
      <div className="mb-3 flex items-center justify-between gap-2 lg:hidden">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-cyan-100">Grid Lock</h1>
          <p className="text-xs text-slate-300">Daily board: {dateKey || "-"}</p>
        </div>
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="inline-flex items-center gap-2 rounded-md border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm font-semibold text-slate-100"
          aria-label="Open game panel"
        >
          <span>Menu</span>
          <span className="inline-flex flex-col gap-1">
            <span className="h-0.5 w-4 bg-slate-100" />
            <span className="h-0.5 w-4 bg-slate-100" />
            <span className="h-0.5 w-4 bg-slate-100" />
          </span>
        </button>
      </div>

      {mobileDrawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/65"
            onClick={() => setMobileDrawerOpen(false)}
            aria-label="Close game panel"
          />
          <div className="absolute right-0 top-0 h-full w-[92vw] max-w-sm overflow-y-auto border-l border-slate-700 bg-slate-900 p-4 shadow-2xl">
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="rounded-md border border-slate-600 px-3 py-1 text-xs font-semibold text-slate-100"
              >
                Close
              </button>
            </div>
            {sidePanel}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <aside className="hidden lg:col-span-1 lg:block">
          {sidePanel}
        </aside>

        <div className="space-y-3 lg:col-span-2">
          {gameState ? (
            <GridView
              grid={gameState.grid}
              disabled={completed || gameState.gameOver}
              score={gameState.score}
              level={gameState.level}
              wordsCleared={gameState.stats.wordsCleared}
              longestWord={gameState.stats.longestWord}
              selection={selection}
              invalidSelection={invalidSelection}
              markedInvalidSelection={markedInvalidSelection}
              cursor={cursor}
              onCellPointerDown={onCellPointerDown}
              onCellPointerEnter={onCellPointerEnter}
              onCellPointerUp={onCellPointerUp}
              onCellDoubleClick={(row, col) => {
                void runPunchout(row, col);
              }}
              onKeyDown={onKeyDown}
            />
          ) : (
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-sm text-slate-300">
              {message || "Loading..."}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
