export type Tile =
    | {kind: "empty"}
    | {kind: "stone"}
    | {kind: "letter"; letter: string; isWildcard: boolean};

export type Grid = Tile[][];

export type Position = {
    row: number;
    col: number;
};

export type RotationDirection = "clockwise" | "counterclockwise";

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

export type BoardPatternResolution = {
    word: string;
    wildcardCount: number;
    score: number;
};

export type BoardQualityMetrics = {
    totalWords: number;
    shortWords: number;
    mediumWords: number;
    longWords: number;
    topWords: string[];
};

export type BoardValidation = {
    version: 2;
    validWords: string[];
    patterns: Record<string, BoardPatternResolution>;
    quality: BoardQualityMetrics;
};

export type StatePayload = {
    dateKey: string;
    state: GameState;
    completed: boolean;
    username?: string | null;
    boardValidation: BoardValidation;
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
