import type { Position, GameState } from "@/lib/types";

export function positionKey(position: Position): string {
    return `${position.row}:${position.col}`;
}

export function dedupePositions(positions: Position[]): Position[] {
    const seen = new Set<string>();
    const unique: Position[] = [];
    for (const position of positions) {
        const key = positionKey(position);
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        unique.push(position);
    }
    return unique;
}

export function pruneMarkedInvalidPositions(
  previousMarked: Position[],
  gridBefore: GameState["grid"],
  clearedSelection: Position[],
  gridAfter: GameState["grid"]
): Position[] {
  if (!previousMarked.length) {
    return previousMarked;
  }

  const clearedRowsByCol = new Map<number, number>();
  for (const position of clearedSelection) {
    const existing = clearedRowsByCol.get(position.col);
    if (existing === undefined || position.row > existing) {
      clearedRowsByCol.set(position.col, position.row);
    }
  }
  const clearedKeys = new Set(clearedSelection.map(positionKey));

  return previousMarked.filter((position) => {
    if (shouldClearMarkedTile(gridBefore, position, clearedRowsByCol, clearedKeys)) {
      return false;
    }
    const tile = gridAfter[position.row]?.[position.col];
    return tile?.kind === "letter";
  });
}



function shouldClearMarkedTile(
  gridBefore: GameState["grid"],
  position: Position,
  clearedRowsByCol: Map<number, number>,
  clearedKeys: Set<string>
): boolean {
  const key = positionKey(position);
  if (clearedKeys.has(key)) {
    return true;
  }

  const clearedRow = clearedRowsByCol.get(position.col);
  if (clearedRow === undefined || position.row >= clearedRow) {
    return false;
  }

  for (let row = position.row + 1; row <= clearedRow; row++) {
    if (gridBefore[row]?.[position.col]?.kind === "stone") {
      return false;
    }
  }

  return true;
}