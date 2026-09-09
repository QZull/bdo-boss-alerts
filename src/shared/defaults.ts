import type { AppState, Boss, DayIndex, SpawnSlot } from './types'
import { DEFAULT_COLOR } from './types'
import { detectUtcOffsetHours } from './utc'

export const DEFAULT_BOSSES: Boss[] = [
  { id: 'kzarka', name: 'Кзарка', location: 'Святилище Серендии', image: 'kzarka.png', color: DEFAULT_COLOR, enabled: true, custom: false },
  { id: 'karanda', name: 'Каранда', location: 'Хребет Каранды', image: 'karanda.png', color: DEFAULT_COLOR, enabled: true, custom: false },
  { id: 'kutum', name: 'Кутум', location: 'Каменный зал Красного песка', image: 'kutum.png', color: DEFAULT_COLOR, enabled: true, custom: false },
  { id: 'nouver', name: 'Нубэр', location: 'Пустыня Валенсии', image: 'nouver.png', color: DEFAULT_COLOR, enabled: true, custom: false },
  { id: 'offin', name: 'Офин', location: 'Руины леса Мирумога', image: 'offin.png', color: DEFAULT_COLOR, enabled: true, custom: false },
  { id: 'vell', name: 'Велл', location: 'Океан Лагри', image: 'vell.png', color: DEFAULT_COLOR, enabled: true, custom: false },
  { id: 'garmoth', name: 'Камос', location: 'Логово Камос, Дриган', image: 'garmoth.png', color: DEFAULT_COLOR, enabled: true, custom: false },
  { id: 'quint', name: 'Квинт', location: 'Холм Квинт', image: 'quint.png', color: DEFAULT_COLOR, enabled: true, custom: false },
  { id: 'muraka', name: 'Мурака', location: 'Западный лес Кальфеона', image: 'muraka.png', color: DEFAULT_COLOR, enabled: true, custom: false },
  { id: 'bulgasal', name: 'Пульгасари', location: 'Хольбон', image: 'bulgasal.png', color: DEFAULT_COLOR, enabled: true, custom: false },
  { id: 'uturi', name: 'Утури', location: 'Турнир мечников', image: 'uturi.png', color: DEFAULT_COLOR, enabled: true, custom: false },
  { id: 'sangoon', name: 'Сангун', location: 'Тигриное нагорье', image: 'sangoon.png', color: DEFAULT_COLOR, enabled: true, custom: false },
  { id: 'golden-pig', name: 'Король золотых свиней', location: 'Пещера золотой свиньи', image: 'golden-pig.png', color: DEFAULT_COLOR, enabled: true, custom: false },
  { id: 'conquest', name: 'Захват территории', location: 'Ноды гильдий', image: 'conquest.png', color: DEFAULT_COLOR, enabled: true, custom: false }
]

const slot = (day: DayIndex, time: string, bossIds: string[]): SpawnSlot => ({ day, time, bossIds })

/** Расписание RU, московское время (UTC+3). Источник: таблица BDO Codex RU. */
export const DEFAULT_SLOTS: SpawnSlot[] = [
  slot(0, '00:00', ['karanda', 'uturi']),
  slot(1, '00:00', ['kzarka', 'sangoon']),
  slot(2, '00:00', ['kutum', 'golden-pig']),
  slot(4, '00:00', ['nouver', 'sangoon']),
  slot(5, '00:00', ['kzarka', 'bulgasal']),
  slot(6, '00:00', ['garmoth']),

  slot(6, '01:00', ['kzarka', 'bulgasal']),

  slot(5, '10:00', ['nouver', 'uturi']),
  slot(6, '10:00', ['kutum', 'golden-pig']),

  slot(2, '12:00', ['nouver', 'bulgasal']),
  slot(4, '12:00', ['karanda', 'golden-pig']),
  slot(5, '12:00', ['kutum', 'golden-pig']),
  slot(6, '12:00', ['nouver', 'sangoon']),

  slot(0, '13:00', ['garmoth']),
  slot(1, '13:00', ['garmoth']),
  slot(2, '13:00', ['garmoth']),
  slot(3, '13:00', ['garmoth']),
  slot(4, '13:00', ['garmoth']),
  slot(5, '13:00', ['garmoth']),
  slot(6, '13:00', ['garmoth']),

  slot(0, '14:00', ['nouver', 'golden-pig']),
  slot(2, '14:00', ['karanda', 'uturi']),
  slot(4, '14:00', ['kutum', 'uturi']),
  slot(5, '14:00', ['quint', 'muraka']),

  slot(1, '16:00', ['kutum', 'golden-pig']),
  slot(3, '16:00', ['nouver', 'uturi']),
  slot(5, '16:00', ['karanda', 'sangoon']),
  slot(6, '16:00', ['vell']),

  slot(0, '18:00', ['kutum', 'sangoon']),
  slot(1, '18:00', ['karanda', 'bulgasal']),
  slot(2, '18:00', ['sangoon', 'offin']),
  slot(3, '18:00', ['kzarka', 'bulgasal']),
  slot(5, '18:00', ['kutum', 'bulgasal']),

  slot(0, '19:00', ['kzarka', 'bulgasal']),
  slot(1, '19:00', ['nouver', 'uturi']),
  slot(3, '19:00', ['karanda', 'golden-pig']),
  slot(4, '19:00', ['kzarka', 'bulgasal']),
  slot(5, '19:00', ['conquest']),
  slot(6, '19:00', ['karanda', 'uturi']),

  slot(0, '22:15', ['garmoth']),
  slot(1, '22:15', ['garmoth']),
  slot(2, '22:15', ['garmoth']),
  slot(3, '22:15', ['garmoth']),
  slot(4, '22:15', ['garmoth']),
  slot(6, '22:15', ['garmoth']),

  slot(0, '23:00', ['nouver', 'golden-pig']),
  slot(1, '23:00', ['quint', 'muraka']),
  slot(2, '23:00', ['vell']),
  slot(3, '23:00', ['kzarka', 'sangoon']),
  slot(4, '23:00', ['offin', 'uturi']),
  slot(6, '23:00', ['offin', 'sangoon'])
]

export const BUILTIN_SOUNDS = [
  { id: 'sound1', name: 'Звук 1', file: 'sound1.mp3' },
  { id: 'sound2', name: 'Звук 2', file: 'sound2.mp3' },
  { id: 'sound3', name: 'Звук 3', file: 'sound3.mp3' },
  { id: 'sound4', name: 'Звук 4', file: 'sound4.mp3' },
  { id: 'sound5', name: 'Звук 5', file: 'sound5.mp3' },
  { id: 'sound6', name: 'Звук 6', file: 'sound6.mp3' },
  { id: 'sound7', name: 'Звук 7', file: 'sound7.mp3' },
  { id: 'sound8', name: 'Звук 8', file: 'sound8.mp3' },
  { id: 'sound9', name: 'Звук 9', file: 'sound9.mp3' },
  { id: 'sound10', name: 'Звук 10', file: 'sound10.mp3' },
  { id: 'sound11', name: 'Звук 11', file: 'sound11.mp3' },
  { id: 'silent', name: 'Без звука' }
] as const

/** Убранные из игры стоковые боссы — вычищаются из сохранённых настроек. */
export const RETIRED_BOSS_IDS = new Set(['black-shadow'])

export function withoutRetiredSlots(slots: SpawnSlot[]): SpawnSlot[] {
  return slots
    .map((slot) => ({ ...slot, bossIds: slot.bossIds.filter((id) => !RETIRED_BOSS_IDS.has(id)) }))
    .filter((slot) => slot.bossIds.length > 0)
}

const LEGACY_SOUND_IDS = new Set(['chime', 'ding', 'horn', 'alarm', 'wood'])

export const DEFAULT_SOUND_ID = 'sound1'

export function migrateSoundId(id: string | undefined): string {
  if (!id || LEGACY_SOUND_IDS.has(id)) return DEFAULT_SOUND_ID
  return id
}

export const UI_SCALE_MIN = 0.8
export const UI_SCALE_MAX = 1.5
export const UI_SCALE_STEP = 0.1

export function clampUiScale(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 1
  const stepped = Math.round(n / UI_SCALE_STEP) * UI_SCALE_STEP
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, Number(stepped.toFixed(1))))
}

export function createDefaultState(): AppState {
  return {
    reminders: [
      { id: 'r60', seconds: 3600, soundId: 'inherit' },
      { id: 'r15', seconds: 900, soundId: 'inherit' },
      { id: 'r5', seconds: 300, soundId: 'inherit' }
    ],
    soundId: DEFAULT_SOUND_ID,
    customSounds: [],
    volume: 0.85,
    autostart: true,
    windowsToast: false,
    toastDurationSeconds: 8,
    uiScale: 1,
    utcOffset: detectUtcOffsetHours(),
    bosses: DEFAULT_BOSSES.map((boss) => ({ ...boss })),
    extraSlots: []
  }
}
