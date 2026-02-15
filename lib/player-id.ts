const PLAYER_ID_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{1,38}[A-Za-z0-9])?$/;

export const PLAYER_ID_MIN_LENGTH = 3;
export const PLAYER_ID_MAX_LENGTH = 40;
export const PLAYER_ID_STORAGE_KEY = "gravity-grid-player-id";

export function normalizePlayerId(value: string): string {
    return value.trim();
}

export function isValidPlayerId(value: string): boolean {
    if (
        value.length < PLAYER_ID_MIN_LENGTH ||
        value.length > PLAYER_ID_MAX_LENGTH
    ) {
        return false;
    }

    return PLAYER_ID_PATTERN.test(value);
}

export function getOrCreatePlayerId(): string {
    const existing = localStorage.getItem(PLAYER_ID_STORAGE_KEY);
    if (existing) {
        return existing;
    }

    const created = crypto.randomUUID();
    localStorage.setItem(PLAYER_ID_STORAGE_KEY, created);
    return created;
}
