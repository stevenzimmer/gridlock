"use client";

import type { KeyboardEvent } from "react";
import { TileView } from "@/components/TileView";
import type { Grid, Position } from "@/lib/types";

type GridViewProps = {
  grid: Grid;
  disabled: boolean;
  score: number;
  level: number;
  wordsCleared: number;
  longestWord: string;
  selection: Position[];
  invalidSelection: Position[];
  markedInvalidSelection: Position[];
  cursor: Position;
  onCellPointerDown: (row: number, col: number) => void;
  onCellPointerEnter: (row: number, col: number) => void;
  onCellPointerUp: () => void;
  onCellDoubleClick: (row: number, col: number) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
};

export function GridView({
  grid,
  disabled,
  score,
  level,
  wordsCleared,
  longestWord,
  selection,
  invalidSelection,
  markedInvalidSelection,
  cursor,
  onCellPointerDown,
  onCellPointerEnter,
  onCellPointerUp,
  onCellDoubleClick,
  onKeyDown
}: GridViewProps) {
  const selectedKeys = new Set(selection.map((p) => `${p.row}:${p.col}`));
  const invalidKeys = new Set(invalidSelection.map((p) => `${p.row}:${p.col}`));
  const markedInvalidKeys = new Set(markedInvalidSelection.map((p) => `${p.row}:${p.col}`));

  return (
    <div
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerUp={onCellPointerUp}
      className={[
        "relative mx-auto w-full rounded-xl lg:p-2 outline-none focus:ring-2 focus:ring-cyan-300",
        disabled ? "bg-slate-700/60" : "bg-slate-900/60"
      ].join(" ")}
      aria-label="Grid Lock board"
    >
      <div className="grid grid-cols-7 gap-1">
        {grid.map((row, rowIdx) =>
          row.map((tile, colIdx) => {
            const key = `${rowIdx}:${colIdx}`;
            const selected = selectedKeys.has(key);
            const invalid = invalidKeys.has(key);
            const markedInvalid = markedInvalidKeys.has(key);
            const isCursor = cursor.row === rowIdx && cursor.col === colIdx;
            const aria =
              tile.kind === "empty"
                ? `Row ${rowIdx + 1} col ${colIdx + 1} empty`
                : tile.kind === "stone"
                  ? `Row ${rowIdx + 1} col ${colIdx + 1} stone`
                  : `Row ${rowIdx + 1} col ${colIdx + 1} letter ${tile.isWildcard ? "wildcard" : tile.letter}`;

            return (
              <button
                key={key}
                type="button"
                aria-label={aria}
                className={[
                  "aspect-square",
                  disabled ? "cursor-not-allowed" : ""
                ].join(" ")}
                disabled={disabled}
                onPointerDown={(event) => {
                  event.preventDefault();
                  onCellPointerDown(rowIdx, colIdx);
                }}
                onPointerEnter={() => onCellPointerEnter(rowIdx, colIdx)}
                onPointerUp={onCellPointerUp}
                onDoubleClick={() => onCellDoubleClick(rowIdx, colIdx)}
              >
                <TileView
                  tile={tile}
                  disabled={disabled}
                  selected={selected}
                  invalid={invalid}
                  markedInvalid={markedInvalid}
                  cursor={isCursor}
                />
              </button>
            );
          })
        )}
      </div>
      {disabled ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-slate-950/35 px-4"
        >
          <div className="w-full max-w-md rounded-lg border-4 border-slate-200/80 bg-slate-800/90 px-4 py-4 text-slate-100 shadow-2xl">
            <div className="game-over-stamp mb-3 text-center text-3xl font-black uppercase tracking-[0.2em] sm:text-5xl py-12">
              Grid lock!
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm font-semibold sm:text-lg">
              <div className="rounded-md border border-slate-300/30 bg-slate-950/40 px-3 py-2">Score: {score}</div>
              <div className="rounded-md border border-slate-300/30 bg-slate-950/40 px-3 py-2">Level: {level}</div>
              <div className="rounded-md border border-slate-300/30 bg-slate-950/40 px-3 py-2">Words: {wordsCleared}</div>
              <div className="rounded-md border border-slate-300/30 bg-slate-950/40 px-3 py-2">
                Longest: {longestWord || "-"}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
