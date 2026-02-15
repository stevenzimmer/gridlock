const USERNAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{1,38}[A-Za-z0-9])?$/;

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 40;

export function normalizeUsername(value: string): string {
  return value.trim();
}

export function isValidUsername(value: string): boolean {
  if (value.length < USERNAME_MIN_LENGTH || value.length > USERNAME_MAX_LENGTH) {
    return false;
  }

  return USERNAME_PATTERN.test(value);
}
