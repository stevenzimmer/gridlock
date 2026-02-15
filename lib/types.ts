export type Tile =
    | {kind: "empty"}
    | {kind: "stone"}
    | {kind: "letter"; letter: string; isWildcard: boolean};

export type Grid = Tile[][];

export type Position = {
    row: number;
    col: number;
};

export type SelectionResult = {
    accepted: boolean;
    selectedWord?: string;
    wildcardCount?: number;
    rowClear?: boolean;
};

export type GameState = {
    grid: Grid;
    score: number;
    gameOver: boolean;
    tickMs: number;
    level: number;
    punchoutsRemaining: number;
    invalidWordsSubmitted: number;
    stats: {
        wordsCleared: number;
        longestWord: string;
    };
};

export type StatePayload = {
    dateKey: string;
    state: GameState;
    completed: boolean;
    username?: string | null;
};

export type SubmitPayload = StatePayload & {
    accepted: boolean;
    message: string;
};

export type ProfilePayload = {
    playerId: string;
    username: string | null;
    displayName: string;
};
