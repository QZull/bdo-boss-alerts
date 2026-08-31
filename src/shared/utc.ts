export const MOSCOW_UTC_OFFSET = 3

export function clampUtcOffset(value: unknown): number {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return MOSCOW_UTC_OFFSET
  return Math.min(14, Math.max(-12, n))
}

export function detectUtcOffsetHours(): number {
  return clampUtcOffset(-Math.round(new Date().getTimezoneOffset() / 60))
}

export function formatUtcOffset(offset: number): string {
  if (offset === 0) return 'UTC±0'
  return offset > 0 ? `UTC+${offset}` : `UTC${offset}`
}

export const UTC_OFFSET_OPTIONS = Array.from({ length: 27 }, (_, i) => {
  const offset = i - 12
  return { value: String(offset), label: formatUtcOffset(offset) }
})
