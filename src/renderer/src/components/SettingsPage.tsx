import { useEffect, useMemo, useState } from 'react'
import type { AppState, Boss, DayIndex, Reminder } from '@shared/types'
import { DAYS_RU, DEFAULT_COLOR } from '@shared/types'
import { BUILTIN_SOUNDS } from '@shared/defaults'
import { parseDurationToSeconds, reminderLabel, reminderSeconds, uid } from '@shared/logic'
import { accent } from '../lib/media'
import { playSound } from '../lib/store'
import { AppSelect } from './AppSelect'
import { BossPortrait } from './BossPortrait'

export function SettingsPage({
  state,
  onChange,
  onBack
}: {
  state: AppState
  onChange: (state: AppState) => void
  onBack: () => void
}) {
  const [tab, setTab] = useState<'reminders' | 'bosses' | 'custom'>('reminders')

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
        <div>
          <h1 className="font-display text-2xl text-[var(--color-gold)]">Настройки</h1>
          <p className="text-sm text-[var(--color-muted)]">Напоминания, звуки, список боссов и свои ивенты</p>
        </div>
        <button className="rounded-full border border-[var(--color-line)] px-4 py-2 text-sm hover:border-[var(--color-gold)]" onClick={onBack}>
          К расписанию
        </button>
      </div>
      <div className="flex gap-2 px-5 pt-4">
        <Tab active={tab === 'reminders'} onClick={() => setTab('reminders')}>Напоминания</Tab>
        <Tab active={tab === 'bosses'} onClick={() => setTab('bosses')}>Боссы</Tab>
        <Tab active={tab === 'custom'} onClick={() => setTab('custom')}>Свои боссы</Tab>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
        {tab === 'reminders' ? <RemindersPanel state={state} onChange={onChange} /> : null}
        {tab === 'bosses' ? <BossesPanel state={state} onChange={onChange} /> : null}
        {tab === 'custom' ? <CustomPanel state={state} onChange={onChange} /> : null}
      </div>
    </div>
  )
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm ${active ? 'bg-[var(--color-gold)] text-black' : 'bg-[var(--color-panel)] text-[var(--color-cream)]'}`}
    >
      {children}
    </button>
  )
}

function ColorSwatch({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <label
      className="relative inline-flex h-7 w-7 shrink-0 cursor-pointer overflow-hidden rounded-full border border-white/25 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.35)]"
      style={{ background: value }}
      title="Цвет"
    >
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  )
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const value = String(i).padStart(2, '0')
  return { value, label: value }
})
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => {
  const value = String(i).padStart(2, '0')
  return { value, label: value }
})

function TimeFields({ value, onChange }: { value: string; onChange: (time: string) => void }) {
  const [hours = '20', minutes = '00'] = value.split(':')
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <AppSelect
        wrapClassName="min-w-0 flex-1"
        className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 outline-none"
        value={hours.padStart(2, '0')}
        onChange={(next) => onChange(`${next}:${minutes.padStart(2, '0')}`)}
        options={HOUR_OPTIONS}
      />
      <span className="text-[var(--color-muted)]">:</span>
      <AppSelect
        wrapClassName="min-w-0 flex-1"
        className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 outline-none"
        value={minutes.padStart(2, '0')}
        onChange={(next) => onChange(`${hours.padStart(2, '0')}:${next}`)}
        options={MINUTE_OPTIONS}
      />
    </div>
  )
}

function DurationField({ value, onChange }: { value: number; onChange: (seconds: number) => void }) {
  const [text, setText] = useState(String(value))

  useEffect(() => {
    setText(String(value))
  }, [value])

  const commit = () => {
    const next = Number(text.replace(',', '.'))
    const clamped = Number.isFinite(next) ? Math.min(120, Math.max(2, Math.round(next))) : 8
    setText(String(clamped))
    if (clamped !== value) onChange(clamped)
  }

  return (
    <span className="mt-2 flex items-center gap-2">
      <input
        type="text"
        inputMode="numeric"
        value={text}
        className="w-20 rounded-lg border border-white/20 bg-black/40 px-3 py-2 outline-none focus:border-[var(--color-gold)]"
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
      />
      <span>секунд</span>
    </span>
  )
}

function RemindersPanel({ state, onChange }: { state: AppState; onChange: (state: AppState) => void }) {
  const [raw, setRaw] = useState('10')
  const [unit, setUnit] = useState<'seconds' | 'minutes' | 'hours'>('minutes')
  const sounds = useMemo(() => {
    return [
      ...BUILTIN_SOUNDS.map((item) => ({ id: item.id, name: item.name })),
      ...state.customSounds.map((item) => ({ id: item.id, name: item.name }))
    ]
  }, [state.customSounds])

  const addReminder = () => {
    const seconds = parseDurationToSeconds(raw, unit)
    if (seconds === null || seconds < 0) return
    if (state.reminders.some((item) => reminderSeconds(item) === seconds)) return
    onChange({
      ...state,
      reminders: [...state.reminders, { id: uid('r'), seconds, soundId: 'inherit' }].sort(
        (a, b) => reminderSeconds(b) - reminderSeconds(a)
      )
    })
  }

  const patchReminder = (id: string, patch: Partial<Reminder>) => {
    onChange({
      ...state,
      reminders: state.reminders.map((item) => (item.id === id ? { ...item, ...patch } : item))
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4">
        <h2 className="font-display text-lg text-[var(--color-gold)]">Когда уведомлять</h2>
        <p className="mb-4 mt-1 text-sm text-[var(--color-muted)]">
          Введите число, выберите секунды, минуты или часы и нажмите «Добавить». Можно несколько точек — например за час, за 15 минут и за 5 минут. Ноль — в момент появления босса.
        </p>
        <div className="mb-4 flex gap-2">
          <input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            className="w-24 rounded-lg border border-white/20 bg-black/40 px-3 py-2 outline-none focus:border-[var(--color-gold)]"
            placeholder="10"
            onKeyDown={(e) => e.key === 'Enter' && addReminder()}
          />
          <AppSelect
            wrapClassName="w-36"
            className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 outline-none"
            value={unit}
            onChange={(value) => setUnit(value as typeof unit)}
            options={[
              { value: 'seconds', label: 'секунды' },
              { value: 'minutes', label: 'минуты' },
              { value: 'hours', label: 'часы' }
            ]}
          />
          <button className="rounded-lg bg-[var(--color-gold)] px-4 py-2 text-black" onClick={addReminder}>
            Добавить
          </button>
        </div>
        <div className="space-y-2">
          {state.reminders.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl bg-black/30 px-3 py-2">
              <div className="w-44 shrink-0 font-medium">{reminderLabel(reminderSeconds(item))}</div>
              <AppSelect
                wrapClassName="min-w-0 flex-1"
                className="rounded-md border border-white/20 bg-[var(--color-panel-2)] px-3 py-1.5 outline-none"
                value={item.soundId}
                onChange={(value) => patchReminder(item.id, { soundId: value })}
                options={[
                  { value: 'inherit', label: 'Как общий звук' },
                  ...sounds.map((sound) => ({ value: sound.id, label: sound.name }))
                ]}
              />
              <button className="shrink-0 text-[var(--color-danger)]" onClick={() => onChange({ ...state, reminders: state.reminders.filter((r) => r.id !== item.id) })}>
                Удалить
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4">
          <h2 className="font-display text-lg text-[var(--color-gold)]">Звук</h2>
          <AppSelect
            wrapClassName="mt-3 w-full"
            className="rounded-md border border-white/20 bg-black/40 px-3 py-2 outline-none"
            value={state.soundId}
            onChange={(value) => onChange({ ...state, soundId: value })}
            options={sounds.map((sound) => ({ value: sound.id, label: sound.name }))}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
              onClick={() => playSound(state.soundId, state.volume)}
            >
              Прослушать
            </button>
            <button
              className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
              onClick={() => window.api.testToast()}
            >
              Тест уведомления
            </button>
            <button
              className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
              onClick={async () => {
                const picked = await window.api.pickSound()
                if (!picked) return
                const id = uid('snd')
                onChange({
                  ...state,
                  soundId: id,
                  customSounds: [...state.customSounds, { id, name: picked.name, fileName: picked.fileName }]
                })
              }}
            >
              Загрузить свой
            </button>
          </div>
          <label className="mt-4 block text-sm text-[var(--color-muted)]">Громкость {Math.round(state.volume * 100)}%</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={state.volume}
            className="app-range mt-1 w-full"
            onChange={(e) => onChange({ ...state, volume: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4">
          <h2 className="font-display text-lg text-[var(--color-gold)]">Система</h2>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Запускать вместе с Windows</span>
            <input
              type="checkbox"
              className="app-check"
              checked={state.autostart}
              onChange={(e) => onChange({ ...state, autostart: e.target.checked })}
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--color-muted)]">Сколько держать уведомление на экране</span>
            <DurationField
              value={state.toastDurationSeconds}
              onChange={(toastDurationSeconds) => onChange({ ...state, toastDurationSeconds })}
            />
          </label>
          <button className="text-sm text-[var(--color-gold)]" onClick={() => window.api.openData()}>
            Открыть папку данных
          </button>
        </div>
      </section>
    </div>
  )
}

function BossesPanel({ state, onChange }: { state: AppState; onChange: (state: AppState) => void }) {
  const patch = (id: string, next: Partial<Boss>) => {
    onChange({
      ...state,
      bosses: state.bosses.map((boss) => (boss.id === id ? { ...boss, ...next } : boss))
    })
  }

  const allOn = state.bosses.every((boss) => boss.enabled)

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          className="rounded-lg border border-[var(--color-line)] px-3 py-1.5 text-sm"
          onClick={() => onChange({ ...state, bosses: state.bosses.map((boss) => ({ ...boss, enabled: !allOn })) })}
        >
          {allOn ? 'Выключить всех' : 'Включить всех'}
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {state.bosses.map((boss) => (
          <div key={boss.id} className="flex items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-3">
            <BossPortrait boss={boss} size={52} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium" style={{ color: accent(boss.color) }}>{boss.name}</div>
              <div className="truncate text-xs text-[var(--color-muted)]">{boss.location}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <label className="flex cursor-pointer items-center" title={boss.enabled ? 'В уведомлениях' : 'Выключен'}>
                <input
                  type="checkbox"
                  className="app-check"
                  checked={boss.enabled}
                  onChange={(e) => patch(boss.id, { enabled: e.target.checked })}
                />
              </label>
              <ColorSwatch value={boss.color} onChange={(color) => patch(boss.id, { color })} />
              {boss.color.toLowerCase() !== DEFAULT_COLOR ? (
                <button className="text-xs text-[var(--color-muted)]" onClick={() => patch(boss.id, { color: DEFAULT_COLOR })}>
                  Сброс
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CustomPanel({ state, onChange }: { state: AppState; onChange: (state: AppState) => void }) {
  const emptyForm = {
    name: '',
    location: '',
    color: DEFAULT_COLOR,
    image: 'custom-boss.png',
    rows: [{ day: 0 as DayIndex, time: '20:00' }]
  }
  const [name, setName] = useState(emptyForm.name)
  const [location, setLocation] = useState(emptyForm.location)
  const [color, setColor] = useState(emptyForm.color)
  const [image, setImage] = useState(emptyForm.image)
  const [rows, setRows] = useState(emptyForm.rows)
  const [editingId, setEditingId] = useState<string | null>(null)

  const previewBoss: Boss = {
    id: editingId ?? 'preview',
    name: name.trim() || 'Новый босс',
    location: location.trim() || 'Локация или ивент',
    image,
    color,
    enabled: true,
    custom: true
  }

  const resetForm = () => {
    setName('')
    setLocation('')
    setColor(DEFAULT_COLOR)
    setImage('custom-boss.png')
    setRows([{ day: 0, time: '20:00' }])
    setEditingId(null)
  }

  const save = () => {
    if (!name.trim() || !rows.length) return
    if (editingId) {
      onChange({
        ...state,
        bosses: state.bosses.map((boss) =>
          boss.id === editingId
            ? { ...boss, name: name.trim(), location: location.trim() || 'Ивент', image, color }
            : boss
        ),
        extraSlots: [
          ...state.extraSlots
            .map((slot) => ({ ...slot, bossIds: slot.bossIds.filter((id) => id !== editingId) }))
            .filter((slot) => slot.bossIds.length),
          ...rows.map((row) => ({ day: row.day, time: row.time, bossIds: [editingId] }))
        ]
      })
      resetForm()
      return
    }
    const id = uid('custom')
    onChange({
      ...state,
      bosses: [
        ...state.bosses,
        {
          id,
          name: name.trim(),
          location: location.trim() || 'Ивент',
          image,
          color,
          enabled: true,
          custom: true
        }
      ],
      extraSlots: [
        ...state.extraSlots,
        ...rows.map((row) => ({ day: row.day, time: row.time, bossIds: [id] }))
      ]
    })
    resetForm()
  }

  const startEdit = (boss: Boss) => {
    setEditingId(boss.id)
    setName(boss.name)
    setLocation(boss.location)
    setColor(boss.color)
    setImage(boss.image)
    const bossRows = state.extraSlots
      .filter((slot) => slot.bossIds.includes(boss.id))
      .map((slot) => ({ day: slot.day, time: slot.time }))
    setRows(bossRows.length ? bossRows : [{ day: 0, time: '20:00' }])
  }

  const customs = state.bosses.filter((boss) => boss.custom)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4">
        <h2 className="font-display text-lg text-[var(--color-gold)]">
          {editingId ? 'Редактировать босса' : 'Добавить ивентового босса'}
        </h2>
        <div className="mt-3 space-y-3">
          <input
            className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 outline-none focus:border-[var(--color-gold)]"
            placeholder="Имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 outline-none focus:border-[var(--color-gold)]"
            placeholder="Локация или ивент"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--color-muted)]">Цвет</span>
            <ColorSwatch value={color} onChange={setColor} />
            <button
              className="rounded-lg border border-white/20 px-3 py-1.5 text-sm"
              onClick={async () => {
                const file = await window.api.pickImage()
                if (file) setImage(`custom:${file}`)
              }}
            >
              Своя картинка
            </button>
          </div>
          <div className="space-y-2">
            {rows.map((row, index) => (
              <div key={index} className="flex gap-2">
                <AppSelect
                  wrapClassName="min-w-0 flex-1"
                  className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 outline-none"
                  value={String(row.day)}
                  onChange={(value) => setRows(rows.map((item, i) => i === index ? { ...item, day: Number(value) as DayIndex } : item))}
                  options={DAYS_RU.map((day, i) => ({ value: String(i), label: day }))}
                />
                <TimeFields
                  value={row.time}
                  onChange={(time) => setRows(rows.map((item, i) => i === index ? { ...item, time } : item))}
                />
                <button className="text-[var(--color-danger)]" onClick={() => setRows(rows.filter((_, i) => i !== index))}>×</button>
              </div>
            ))}
            <button className="text-sm text-[var(--color-gold)]" onClick={() => setRows([...rows, { day: 0, time: '20:00' }])}>
              + ещё время
            </button>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 rounded-lg bg-[var(--color-gold)] py-2 text-black" onClick={save}>
              {editingId ? 'Сохранить' : 'Добавить в расписание'}
            </button>
            {editingId ? (
              <button className="rounded-lg border border-white/20 px-4 py-2 text-sm" onClick={resetForm}>
                Отмена
              </button>
            ) : null}
          </div>
        </div>
      </section>
      <section className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4">
        <h2 className="font-display text-lg text-[var(--color-gold)]">Превью и список</h2>
        <div className="mt-3 rounded-xl border border-[var(--color-line)] bg-black/30 p-3">
          <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Как на карте</div>
          <div className="flex items-center gap-2">
            <BossPortrait boss={previewBoss} size={40} />
            <div className="min-w-0">
              <div className="truncate font-medium" style={{ color: accent(previewBoss.color) }}>{previewBoss.name}</div>
              <div className="truncate text-xs text-[var(--color-muted)]">{previewBoss.location}</div>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {customs.length ? customs.map((boss) => (
            <div key={boss.id} className="flex items-center gap-3 rounded-xl bg-black/30 p-2">
              <BossPortrait boss={boss} size={40} />
              <div className="min-w-0 flex-1">
                <div style={{ color: accent(boss.color) }}>{boss.name}</div>
                <div className="text-xs text-[var(--color-muted)]">{boss.location}</div>
              </div>
              <button className="text-sm text-[var(--color-gold)]" onClick={() => startEdit(boss)}>
                Изменить
              </button>
              <button
                className="text-sm text-[var(--color-danger)]"
                onClick={() => {
                  if (editingId === boss.id) resetForm()
                  onChange({
                    ...state,
                    bosses: state.bosses.filter((item) => item.id !== boss.id),
                    extraSlots: state.extraSlots
                      .map((slot) => ({ ...slot, bossIds: slot.bossIds.filter((id) => id !== boss.id) }))
                      .filter((slot) => slot.bossIds.length)
                  })
                }}
              >
                Удалить
              </button>
            </div>
          )) : (
            <p className="text-sm text-[var(--color-muted)]">Пока нет своих боссов. Если выйдет ивентовый — добавьте имя, время и картинку.</p>
          )}
        </div>
      </section>
    </div>
  )
}
