export function isValidRating(value: number): boolean {
  return Number.isFinite(value) && value >= 0.5 && value <= 5 && Number.isInteger(value * 2)
}
