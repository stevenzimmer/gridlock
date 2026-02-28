"use client";

import {useCallback, useRef} from "react";
import type {CSSProperties} from "react";
import {RotateCcw, RotateCw} from "lucide-react";
import {TileView} from "@/components/TileView";
import {useGameContext} from "@/components/GameContext";
import {GRID_COLS, GRID_ROWS} from "@/lib/config";
import {GameOverlay} from "./GameOverlay";

export function GridView() {
    const {
        grid,
        disabled,
        gameOver,
        rotationVisualAngle,
        rotationTransitioning,
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
        onKeyDown,
    } = useGameContext();
    const activePointerIdRef = useRef<number | null>(null);

    const extendSelectionFromPoint = useCallback(
        (clientX: number, clientY: number) => {
            const element = document.elementFromPoint(clientX, clientY);
            const cellButton = element?.closest<HTMLButtonElement>(
                "[data-grid-cell='true']",
            );
            if (!cellButton) {
                return;
            }
            const row = Number(cellButton.dataset.row);
            const col = Number(cellButton.dataset.col);
            if (Number.isNaN(row) || Number.isNaN(col)) {
                return;
            }
            onCellPointerEnter(row, col);
        },
        [onCellPointerEnter],
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
            onCellPointerUp();
        },
        [onCellPointerUp],
    );

    if (!grid) {
        return (
            <div
                className="relative mx-auto w-full rounded-xl bg-slate-900/60 p-2"
                aria-label="Loading game board"
                aria-busy="true"
            >
                <div className="grid gap-1" style={{gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`}}>
                    {Array.from({length: GRID_ROWS * GRID_COLS}, (_, idx) => (
                        <div
                            key={`skeleton-${idx}`}
                            className="aspect-square rounded-md border border-slate-700/80 bg-slate-800/80 animate-pulse"
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
    const selectedKeys = new Set(selection.map((p) => `${p.row}:${p.col}`));
    const invalidKeys = new Set(
        invalidSelection.map((p) => `${p.row}:${p.col}`),
    );
    const markedInvalidKeys = new Set(
        markedInvalidSelection.map((p) => `${p.row}:${p.col}`),
    );
    const clearingKeys = new Set(clearingSelection.map((p) => `${p.row}:${p.col}`));
    const rotatingGridStyle: CSSProperties = {
        gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
        transform: `rotate(${rotationVisualAngle}deg)`,
        ["--tile-upright-angle" as string]: `${-rotationVisualAngle}deg`,
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
                    extendSelectionFromPoint(event.clientX, event.clientY);
                }}
                onPointerUp={(event) => handlePointerUp(event.pointerId)}
                onPointerCancel={(event) => handlePointerUp(event.pointerId)}
                className={[
                    "relative mx-auto w-full rounded-xl lg:p-2 outline-none focus:ring-2 focus:ring-cyan-300 touch-none",
                    disabled ? "bg-slate-700/60" : "bg-slate-900/60",
                ].join(" ")}
                aria-label="Gridlock board"
            >
                <div
                    className={[
                        "grid gap-1 origin-center",
                        rotationTransitioning ? "duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] transition-transform" : "",
                    ].join(" ")}
                    style={rotatingGridStyle}
                >
                {grid.map((row, rowIdx) =>
                    row.map((tile, colIdx) => {
                        const key = `${rowIdx}:${colIdx}`;
                        const selected = selectedKeys.has(key);
                        const invalid = invalidKeys.has(key);
                        const markedInvalid = markedInvalidKeys.has(key);
                        const clearing = clearingKeys.has(key);
                        const settleEffect = settlingEffects[key];
                        const isCursor =
                            cursor.row === rowIdx && cursor.col === colIdx;
                        const aria =
                            tile.kind === "empty"
                                ? `Row ${rowIdx + 1} col ${colIdx + 1} empty`
                                : tile.kind === "stone"
                                ? `Row ${rowIdx + 1} col ${colIdx + 1} stone`
                                : `Row ${rowIdx + 1} col ${colIdx + 1} letter ${
                                      tile.isWildcard ? "wildcard" : tile.letter
                                  }`;

                        return (
                            <button
                                key={key}
                                type="button"
                                aria-label={aria}
                                data-grid-cell="true"
                                data-row={rowIdx}
                                data-col={colIdx}
                                className={[
                                    "aspect-square select-none touch-none",
                                    disabled ? "cursor-not-allowed" : "",
                                ].join(" ")}
                                disabled={disabled}
                                onPointerDown={(event) => {
                                    event.preventDefault();
                                    activePointerIdRef.current =
                                        event.pointerId;
                                    event.currentTarget.setPointerCapture(
                                        event.pointerId,
                                    );
                                    onCellPointerDown(rowIdx, colIdx);
                                }}
                                onPointerEnter={() =>
                                    onCellPointerEnter(rowIdx, colIdx)
                                }
                                onPointerUp={(event) =>
                                    handlePointerUp(event.pointerId)
                                }
                                onDoubleClick={() =>
                                    onCellDoubleClick(rowIdx, colIdx)
                                }
                            >
                                <TileView
                                    tile={tile}
                                    disabled={disabled}
                                    selected={selected}
                                    invalid={invalid}
                                    markedInvalid={markedInvalid}
                                    clearing={clearing}
                                    settleEffect={settleEffect}
                                    settleNonce={settleNonce}
                                    rowFlashing={clearingRow === rowIdx}
                                    cursor={isCursor}
                                />
                            </button>
                        );
                    }),
                )}
                </div>
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
