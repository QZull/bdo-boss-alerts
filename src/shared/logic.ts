import { DAYS_RU } from './types'
import type { AppState, Boss, DayIndex, SpawnSlot, UpcomingGroup } from './types'
import { DEFAULT_SLOTS } from './defaults'
import { clampUtcOffset, MOSCOW_UTC_OFFSET } from './utc'

const MOSCOW = 'Europe/Moscow'

function mergeSlotList(slots: SpawnSlot[]): SpawnSlot[] {
  const map = new Map<string, SpawnSlot>()
  for (const slot of slots) {
    const key = `${slot.day}|${slot.time}`
    const current = map.get(key)
    if (!current) {
      map.set(key, { ...slot, bossIds: [...slot.bossIds] })
      continue
    }
    for (const id of slot.bossIds) {
      if (!current.bossIds.includes(id)) current.bossIds.push(id)
    }
  }
  return [...map.values()]
}

export function mergeSlots(extra: SpawnSlot[]): SpawnSlot[] {
  return mergeSlotList([...DEFAULT_SLOTS, ...extra])
}

export function shiftSlot(slot: SpawnSlot, fromOffset: number, toOffset: number): SpawnSlot {
  let mins = toMinutes(slot.time) + (toOffset - fromOffset) * 60
  let day = slot.day as number
  while (mins < 0) {
    mins += 24 * 60
    day = (day + 6) % 7
  }
  while (mins >= 24 * 60) {
    mins -= 24 * 60
    day = (day + 1) % 7
  }
  const hour = Math.floor(mins / 60)
  const minute = mins % 60
  return { day: day as DayIndex, time: padTime(hour, minute), bossIds: [...slot.bossIds] }
}

export function displaySlots(extra: SpawnSlot[], utcOffset: number): SpawnSlot[] {
  const offset = clampUtcOffset(utcOffset)
  return mergeSlotList(mergeSlots(extra).map((slot) => shiftSlot(slot, MOSCOW_UTC_OFFSET, offset)))
}

export function offsetParts(at: number, utcOffset: number): { weekday: DayIndex; time: string; hour: number; minute: number } {
  const shifted = new Date(at + clampUtcOffset(utcOffset) * 3_600_000)
  const weekday = ((shifted.getUTCDay() + 6) % 7) as DayIndex
  const hour = shifted.getUTCHours()
  const minute = shifted.getUTCMinutes()
  return { weekday, hour, minute, time: padTime(hour, minute) }
}

export function uniqueTimes(slots: SpawnSlot[]): string[] {
  return [...new Set(slots.map((slot) => slot.time))].sort((a, b) => toMinutes(a) - toMinutes(b))
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function padTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function moscowParts(date = new Date()): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  weekday: DayIndex
} {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: MOSCOW,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  })
  const parts = Object.fromEntries(fmt.formatToParts(date).map((part) => [part.type, part.value]))
  const weekMap: Record<string, DayIndex> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: weekMap[parts.weekday] ?? 0
  }
}

export function moscowDateTimeMs(year: number, month: number, day: number, hour: number, minute: number): number {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0)
  const parts = moscowParts(new Date(utcGuess))
  const wanted = Date.UTC(year, month - 1, day, hour, minute, 0)
  const actual = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0)
  return utcGuess + (wanted - actual)
}

export function formatCountdown(ms: number): string {
  if (ms < 0) ms = 0
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}ч ${String(m).padStart(2, '0')}м ${String(s).padStart(2, '0')}с`
  return `${m}м ${String(s).padStart(2, '0')}с`
}

export function formatWhen(at: number, utcOffset = MOSCOW_UTC_OFFSET): string {
  const parts = offsetParts(at, utcOffset)
  return `${DAYS_RU[parts.weekday]}, ${parts.time}`
}

export function bossesById(state: AppState): Map<string, Boss> {
  return new Map(state.bosses.map((boss) => [boss.id, boss]))
}

export function upcomingGroups(state: AppState, now = Date.now(), limit = 8, onlyEnabled = true): UpcomingGroup[] {
  const slots = mergeSlots(state.extraSlots)
  const dict = bossesById(state)
  const nowParts = moscowParts(new Date(now))
  const groups: UpcomingGroup[] = []

  for (const slot of slots) {
    const bosses = slot.bossIds
      .map((id) => dict.get(id))
      .filter((boss): boss is Boss => Boolean(boss && (!onlyEnabled || boss.enabled)))
    if (!bosses.length) continue

    const delta = (slot.day - nowParts.weekday + 7) % 7
    const [h, m] = slot.time.split(':').map(Number)
    let at = moscowDateTimeMs(nowParts.year, nowParts.month, nowParts.day + delta, h, m)
    if (at <= now) {
      at = moscowDateTimeMs(nowParts.year, nowParts.month, nowParts.day + delta + 7, h, m)
    }
    groups.push({ at, day: slot.day, time: slot.time, bosses })
  }

  return groups.sort((a, b) => a.at - b.at).slice(0, limit)
}

export function slotBosses(state: AppState, day: DayIndex, time: string, onlyEnabled = false, slots?: SpawnSlot[]): Boss[] {
  const dict = bossesById(state)
  const list = slots ?? mergeSlots(state.extraSlots)
  const slot = list.find((item) => item.day === day && item.time === time)
  if (!slot) return []
  return slot.bossIds
    .map((id) => dict.get(id))
    .filter((boss): boss is Boss => Boolean(boss && (!onlyEnabled || boss.enabled)))
}

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`
}

export function reminderSeconds(item: { seconds?: number; minutes?: number }): number {
  if (typeof item.seconds === 'number') return item.seconds
  return Math.round((item.minutes ?? 0) * 60)
}

export function parseDurationToSeconds(raw: string, unit: 'seconds' | 'minutes' | 'hours' = 'minutes'): number | null {
  const text = raw.trim().toLowerCase().replace(',', '.')
  if (!text) return null
  const tagged = text.match(/^(\d+(?:\.\d+)?)\s*(с|сек|секунд|секунды|s|м|мин|минут|минуты|min|ч|час|часа|часов|h)$/)
  if (tagged) {
    const value = Number(tagged[1])
    const suffix = tagged[2]
    if (/^(с|сек|секунд|секунды|s)$/.test(suffix)) return Math.round(value)
    if (/^(ч|час|часа|часов|h)$/.test(suffix)) return Math.round(value * 3600)
    return Math.round(value * 60)
  }
  const value = Number(text)
  if (!Number.isFinite(value) || value < 0) return null
  if (unit === 'hours') return Math.round(value * 3600)
  if (unit === 'seconds') return Math.round(value)
  return Math.round(value * 60)
}

export function reminderLabel(seconds: number): string {
  if (seconds === 0) return 'В момент появления'
  if (seconds % 3600 === 0 && seconds >= 3600) {
    const h = seconds / 3600
    return `За ${h} ${hoursWord(h)}`
  }
  if (seconds % 60 === 0) {
    const m = seconds / 60
    return `За ${m} ${minutesWord(m)}`
  }
  return `За ${seconds} ${secondsWord(seconds)}`
}

export function reminderToastTitle(seconds: number): string {
  if (seconds === 0) return 'Сейчас'
  if (seconds % 3600 === 0 && seconds >= 3600) {
    const h = seconds / 3600
    return `Через ${h} ${hoursWord(h)}`
  }
  if (seconds % 60 === 0) {
    const m = seconds / 60
    return `Через ${m} ${minutesWord(m)}`
  }
  return `Через ${seconds} ${secondsWord(seconds)}`
}

export function formatThrough(ms: number): string {
  const mins = Math.round(Math.max(0, ms) / 60000)
  if (mins < 1) return 'через меньше минуты'
  if (mins < 60) return `через ${mins} ${minutesWord(mins)}`
  const hours = Math.round(mins / 60)
  return `через ${hours} ${hoursWord(hours)}`
}

function hoursWord(n: number): string {
  const abs = Math.abs(n) % 100
  const d = abs % 10
  if (abs > 10 && abs < 20) return 'часов'
  if (d === 1) return 'час'
  if (d >= 2 && d <= 4) return 'часа'
  return 'часов'
}

function minutesWord(n: number): string {
  const abs = Math.abs(n) % 100
  const d = abs % 10
  if (abs > 10 && abs < 20) return 'минут'
  if (d === 1) return 'минуту'
  if (d >= 2 && d <= 4) return 'минуты'
  return 'минут'
}

function secondsWord(n: number): string {
  const abs = Math.abs(n) % 100
  const d = abs % 10
  if (abs > 10 && abs < 20) return 'секунд'
  if (d === 1) return 'секунду'
  if (d >= 2 && d <= 4) return 'секунды'
  return 'секунд'
}
