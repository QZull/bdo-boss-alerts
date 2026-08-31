export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Reminder {
  id: string
  seconds: number
  soundId: string
}

export interface CustomSound {
  id: string
  name: string
  fileName: string
}

export interface Boss {
  id: string
  name: string
  location: string
  image: string
  color: string
  enabled: boolean
  custom: boolean
}

export interface SpawnSlot {
  day: DayIndex
  time: string
  bossIds: string[]
}

export interface AppState {
  reminders: Reminder[]
  soundId: string
  customSounds: CustomSound[]
  volume: number
  autostart: boolean
  windowsToast: boolean
  toastDurationSeconds: number
  uiScale: number
  utcOffset: number
  bosses: Boss[]
  extraSlots: SpawnSlot[]
}

export interface UpcomingGroup {
  at: number
  day: DayIndex
  time: string
  bosses: Boss[]
}

export interface ToastPayload {
  title: string
  body: string
  minutes: number
  bosses: Boss[]
  soundId: string
  volume: number
  durationMs: number
  soundBase64?: string
  soundMime?: string
}

export const DAYS_RU = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье'
] as const

export const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const

export const DEFAULT_COLOR = '#ffffff'
