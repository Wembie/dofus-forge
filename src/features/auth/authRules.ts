// Mirrors the existing account constraint and Auth form password minimum.
export const USERNAME_PATTERN = '[a-z0-9_-]{3,30}'
export const USERNAME_RE = new RegExp(`^${USERNAME_PATTERN}$`)
export const PASSWORD_MIN_LENGTH = 6
