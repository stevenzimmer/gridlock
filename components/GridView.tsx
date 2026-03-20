"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { RotateCcw, RotateCw } from "lucide-react";
import { TileView } from "@/components/TileView";
import { useGameContext } from "@/components/GameContext";
import { GRID_COLS, GRID_ROWS } from "@/lib/config";
import { GameOverlay } from "./GameOverlay";

export function GridView() {
  const {
    grid,
    disabled,
    gameOver,
    rotationVisualAngle,
    rotationTransitioning,
    effectsReduced,
    successImpactNonce,
    invalidImpactNonce,
    rowSweepNonce,
    rowSweepRow,
    floatingReward,
    selection,
    invalidSelection,
    markedInvalidSelection,
    clearingSelection,
    settlingEffects,
    settleNonce,
    clearingRow,
    cursor,
    rotateClockwise,
    rotateCounterclockwise,
    onCellPointerDown,
    onCellPointerEnter,
    onCellPointerUp,
    onCellDoubleClick,
    onKeyDown
  } = useGameContext();
  const boardRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const pendingPointRef = useRef<{ x: number; y: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [boardImpactClass, setBoardImpactClass] = useState("");

  useEffect(() => {
    if (!invalidImpactNonce) {
      return;
    }
    setBoardImpactClass("board-impact-negative");
    const timeoutId = window.setTimeout(() => {
      setBoardImpactClass("");
    }, 280);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [invalidImpactNonce]);

  useEffect(() => {
    if (!successImpactNonce) {
      return;
    }
    setBoardImpactClass("board-impact-positive");
    const timeoutId = window.setTimeout(() => {
      setBoardImpactClass("");
    }, 220);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [successImpactNonce]);

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    },
    []
  );

  const gridFlags = useMemo(() => {
    const cellCount = GRID_ROWS * GRID_COLS;
    const selected = new Uint8Array(cellCount);
    const invalid = new Uint8Array(cellCount);
    const markedInvalid = new Uint8Array(cellCount);
    const clearing = new Uint8Array(cellCount);

    for (const position of selection) {
      selected[toIndex(position.row, position.col)] = 1;
    }
    for (const position of invalidSelection) {
      invalid[toIndex(position.row, position.col)] = 1;
    }
    for (const position of markedInvalidSelection) {
      markedInvalid[toIndex(position.row, position.col)] = 1;
    }
    for (const position of clearingSelection) {
      clearing[toIndex(position.row, position.col)] = 1;
    }

    return { selected, invalid, markedInvalid, clearing };
  }, [selection, invalidSelection, markedInvalidSelection, clearingSelection]);

  const extendSelectionFromPoint = useCallback(
    (clientX: number, clientY: number) => {
      const board = boardRef.current;
      if (!board) {
        return;
      }

      const rect = board.getBoundingClientRect();
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        return;
      }

      const col = Math.min(
        GRID_COLS - 1,
        Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * GRID_COLS))
      );
      const row = Math.min(
        GRID_ROWS - 1,
        Math.max(0, Math.floor(((clientY - rect.top) / rect.height) * GRID_ROWS))
      );
      onCellPointerEnter(row, col);
    },
    [onCellPointerEnter]
  );

  const schedulePointerExtension = useCallback(
    (clientX: number, clientY: number) => {
      pendingPointRef.current = { x: clientX, y: clientY };
      if (animationFrameRef.current !== null) {
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(() => {
        animationFrameRef.current = null;
        const point = pendingPointRef.current;
        if (!point) {
          return;
        }
        pendingPointRef.current = null;
        extendSelectionFromPoint(point.x, point.y);
      });
    },
    [extendSelectionFromPoint]
  );

  const handlePointerUp = useCallback(
    (pointerId?: number) => {
      if (
        pointerId !== undefined &&
        activePointerIdRef.current !== null &&
        activePointerIdRef.current !== pointerId
      ) {
        return;
      }
      activePointerIdRef.current = null;
      pendingPointRef.current = null;
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      onCellPointerUp();
    },
    [onCellPointerUp]
  );

  if (!grid) {
    return (
      <div
        className="relative mx-auto w-full rounded-xl bg-slate-900/60 p-2"
        aria-label="Loading game board"
        aria-busy="true"
      >
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}>
          {Array.from({ length: GRID_ROWS * GRID_COLS }, (_, idx) => (
            <div
              key={`skeleton-${idx}`}
              className="aspect-square animate-pulse rounded-md border border-slate-700/80 bg-slate-800/80"
              aria-hidden="true"
            />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-slate-950/45">
          <div className="inline-flex items-center gap-3 rounded-full border border-slate-600/80 bg-slate-900/85 px-4 py-2 text-sm font-semibold text-slate-100">
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-transparent"
              aria-hidden="true"
            />
            <span>Loading</span>
          </div>
        </div>
      </div>
    );
  }

  const rotatingGridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
    transform: `rotate(${rotationVisualAngle}deg)`,
    ["--tile-upright-angle" as string]: `${-rotationVisualAngle}deg`
  };

  return (
    <div className="space-y-2">
      <div
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerMove={(event) => {
          if (activePointerIdRef.current !== event.pointerId) {
            return;
          }
          event.preventDefault();
          schedulePointerExtension(event.clientX, event.clientY);
        }}
        onPointerUp={(event) => handlePointerUp(event.pointerId)}
        onPointerCancel={(event) => handlePointerUp(event.pointerId)}
        className={[
          "relative mx-auto w-full rounded-xl outline-none touch-none focus:ring-2 focus:ring-cyan-300 lg:p-2",
          disabled ? "bg-slate-700/60" : "bg-slate-900/60",
          boardImpactClass
        ].join(" ")}
        style={{ contain: "layout paint" }}
        aria-label="Gridlock board"
      >
        <div
          ref={boardRef}
          className={[
            "grid origin-center gap-1",
            rotationTransitioning
              ? "transition-transform duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
              : ""
          ].join(" ")}
          style={rotatingGridStyle}
        >
          {grid.map((row, rowIdx) =>
            row.map((tile, colIdx) => {
              const index = toIndex(rowIdx, colIdx);
              const settleEffect = settlingEffects[`${rowIdx}:${colIdx}`];
              const isCursor = cursor.row === rowIdx && cursor.col === colIdx;
              const aria =
                tile.kind === "empty"
                  ? `Row ${rowIdx + 1} col ${colIdx + 1} empty`
                  : tile.kind === "stone"
                    ? `Row ${rowIdx + 1} col ${colIdx + 1} stone`
                    : `Row ${rowIdx + 1} col ${colIdx + 1} letter ${tile.isWildcard ? "wildcard" : tile.letter}`;

              return (
                <button
                  key={`${rowIdx}:${colIdx}`}
                  type="button"
                  aria-label={aria}
                  className={["aspect-square select-none touch-none", disabled ? "cursor-not-allowed" : ""].join(" ")}
                  disabled={disabled}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    activePointerIdRef.current = event.pointerId;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    onCellPointerDown(rowIdx, colIdx);
                  }}
                  onPointerUp={(event) => handlePointerUp(event.pointerId)}
                  onDoubleClick={() => onCellDoubleClick(rowIdx, colIdx)}
                >
                  <TileView
                    tile={tile}
                    disabled={disabled}
                    effectsReduced={effectsReduced}
                    selected={gridFlags.selected[index] === 1}
                    invalid={gridFlags.invalid[index] === 1}
                    markedInvalid={gridFlags.markedInvalid[index] === 1}
                    clearing={gridFlags.clearing[index] === 1}
                    settleEffect={settleEffect}
                    settleNonce={settleNonce}
                    rowFlashing={clearingRow === rowIdx}
                    cursor={isCursor}
                  />
                </button>
              );
            })
          )}
        </div>
        {!effectsReduced && rowSweepRow !== null ? (
          <div
            key={`row-sweep-${rowSweepNonce}`}
            className="pointer-events-none absolute inset-x-1 row-clear-sweep"
            style={{
              top: `${(rowSweepRow / GRID_ROWS) * 100}%`,
              height: `${100 / GRID_ROWS}%`
            }}
            aria-hidden="true"
          />
        ) : null}
        {!effectsReduced && floatingReward ? (
          <div
            key={`reward-${floatingReward.id}`}
            className={[
              "pointer-events-none absolute reward-float text-xl font-black uppercase tracking-wide sm:text-2xl",
              floatingReward.kind === "rowClear" ? "text-amber-200" : "text-emerald-200"
            ].join(" ")}
            style={{
              left: `${(((floatingReward.startCol + floatingReward.endCol + 1) / 2) / GRID_COLS) * 100}%`,
              top: `${((floatingReward.row + 0.6) / GRID_ROWS) * 100}%`
            }}
            aria-hidden="true"
          >
            {floatingReward.text}
          </div>
        ) : null}
        {!effectsReduced && successImpactNonce > 0 ? (
          <div
            key={`success-overlay-${successImpactNonce}`}
            className="pointer-events-none absolute inset-0 success-impact-overlay"
            aria-hidden="true"
          />
        ) : null}
        {invalidImpactNonce > 0 ? (
          <div
            key={`invalid-overlay-${invalidImpactNonce}`}
            className="pointer-events-none absolute inset-0 invalid-impact-overlay"
            aria-hidden="true"
          />
        ) : null}
        {gameOver ? <GameOverlay /> : null}
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            void rotateCounterclockwise();
          }}
          disabled={disabled}
          aria-label="Rotate board counterclockwise"
          className="rounded border border-amber-300/60 bg-amber-600/20 px-3 py-1 text-3xl leading-none text-amber-100 enabled:hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <RotateCcw className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => {
            void rotateClockwise();
          }}
          disabled={disabled}
          aria-label="Rotate board clockwise"
          className="rounded border border-amber-300/60 bg-amber-600/20 px-3 py-1 text-3xl leading-none text-amber-100 enabled:hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <RotateCw className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function toIndex(row: number, col: number): number {
  return row * GRID_COLS + col;
}
