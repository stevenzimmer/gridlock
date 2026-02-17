"use client";

import {useCallback, useRef} from "react";
import {TileView} from "@/components/TileView";
import {useGameContext} from "@/components/GameContext";
import {GameOverlay} from "./GameOverlay";

export function GridView() {
    const {
        grid,
        disabled,
        selection,
        invalidSelection,
        markedInvalidSelection,
        cursor,
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
        return null;
    }
    const selectedKeys = new Set(selection.map((p) => `${p.row}:${p.col}`));
    const invalidKeys = new Set(
        invalidSelection.map((p) => `${p.row}:${p.col}`),
    );
    const markedInvalidKeys = new Set(
        markedInvalidSelection.map((p) => `${p.row}:${p.col}`),
    );

    return (
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
            <div className="grid grid-cols-7 gap-1">
                {grid.map((row, rowIdx) =>
                    row.map((tile, colIdx) => {
                        const key = `${rowIdx}:${colIdx}`;
                        const selected = selectedKeys.has(key);
                        const invalid = invalidKeys.has(key);
                        const markedInvalid = markedInvalidKeys.has(key);
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
                                    cursor={isCursor}
                                />
                            </button>
                        );
                    }),
                )}
            </div>
            {disabled ? <GameOverlay /> : null}
        </div>
    );
}
