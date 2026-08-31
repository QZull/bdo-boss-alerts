import type { AppState, Boss } from '@shared/types'
import { DAYS_RU, DAYS_SHORT } from '@shared/types'
import { displaySlots, formatCountdown, formatWhen, offsetParts, slotBosses, uniqueTimes, upcomingGroups } from '@shared/logic'
import { accent } from '../lib/media'
import { BossPortrait } from './BossPortrait'

export function SchedulePage({
  state,
  now,
  onOpenSettings
}: {
  state: AppState
  now: number
  onOpenSettings: () => void
}) {
  const slots = displaySlots(state.extraSlots, state.utcOffset)
  const times = uniqueTimes(slots)
  const today = offsetParts(now, state.utcOffset).weekday
  const upcoming = upcomingGroups(state, now, 4, true)
  const next = upcoming[0] ? offsetParts(upcoming[0].at, state.utcOffset) : null
  const nextKey = next ? `${next.weekday}|${next.time}` : ''

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--color-line)] px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="font-display text-2xl text-[var(--color-gold)]">Недельная карта респа</h1>
          <button
            className="rounded-full border border-[var(--color-line)] px-4 py-2 text-sm hover:border-[var(--color-gold)]"
            onClick={onOpenSettings}
          >
            Настройки
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {upcoming.length ? upcoming.map((group, index) => (
            <UpcomingCard
              key={`${group.at}-${index}`}
              bosses={group.bosses}
              at={group.at}
              now={now}
              utcOffset={state.utcOffset}
              label={index === 0 ? 'Следующие' : 'Потом'}
            />
          )) : (
            <div className="col-span-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-6 text-sm text-[var(--color-muted)]">
              Нет включённых боссов в расписании.
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-5">
        <div className="min-w-[920px]">
          <div className="grid gap-2" style={{ gridTemplateColumns: '3.2rem repeat(7, minmax(0, 1fr))' }}>
            <div className="rounded-lg bg-black/30 px-1 py-3 text-center text-[11px] text-[var(--color-muted)]">
              Время
            </div>
            {DAYS_SHORT.map((day, index) => (
              <div
                key={day}
                className={`rounded-lg px-2 py-3 text-center font-display text-sm ${
                  index === today ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)]' : 'bg-black/30 text-[var(--color-cream)]'
                }`}
              >
                {DAYS_RU[index]}
              </div>
            ))}
            {times.map((time) => (
              <Row key={time} time={time} state={state} slots={slots} today={today} nextKey={nextKey} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function UpcomingCard({
  bosses,
  at,
  now,
  utcOffset,
  label
}: {
  bosses: Boss[]
  at: number
  now: number
  utcOffset: number
  label: string
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-3">
      <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
        <span>{label}</span>
        <span className="normal-case tracking-normal">{formatWhen(at, utcOffset)}</span>
      </div>
      <div className="flex items-center gap-2">
        {bosses.map((boss) => (
          <BossPortrait key={boss.id} boss={boss} size={46} />
        ))}
        <div className="min-w-0">
          <div className="truncate font-medium">
            {bosses.map((boss, i) => (
              <span key={boss.id} style={{ color: accent(boss.color) }}>
                {i ? ' · ' : ''}
                {boss.name}
              </span>
            ))}
          </div>
          <div className="font-display text-lg text-[var(--color-gold)]">{formatCountdown(at - now)}</div>
        </div>
      </div>
    </div>
  )
}

function Row({
  time,
  state,
  slots,
  today,
  nextKey
}: {
  time: string
  state: AppState
  slots: ReturnType<typeof displaySlots>
  today: number
  nextKey: string
}) {
  return (
    <>
      <div className="flex items-center justify-center rounded-lg bg-[var(--color-panel)] px-1 font-display text-[13px] text-[var(--color-gold)]">
        {time}
      </div>
      {DAYS_SHORT.map((_, day) => {
        const bosses = slotBosses(state, day as 0 | 1 | 2 | 3 | 4 | 5 | 6, time, false, slots)
        const key = `${day}|${time}`
        const isNext = key === nextKey
        const isToday = day === today
        return (
          <div
            key={key}
            className={`flex min-h-[108px] items-center justify-center rounded-xl border bg-[var(--color-panel)] p-2 ${
              isNext ? 'pulse-gold border-[var(--color-gold)]' : 'border-[var(--color-line)]'
            } ${isToday && !isNext ? 'bg-[var(--color-panel-2)]' : ''}`}
            title={bosses.length ? bosses.map((boss) => `${boss.name} — ${boss.location}`).join('\n') : undefined}
          >
            {bosses.length ? (
              <div className="flex max-w-full flex-col gap-2">
                {bosses.map((boss) => (
                  <div key={boss.id} className={`flex min-w-0 items-center gap-2.5 ${boss.enabled ? '' : 'opacity-35'}`}>
                    <BossPortrait boss={boss} size={40} />
                    <div className="min-w-0 text-left">
                      <div className="truncate text-[13px] leading-tight" style={{ color: accent(boss.color, '#f3ead7') }}>
                        {boss.name}
                      </div>
                      <div className="truncate text-[11px] leading-tight text-[var(--color-muted)]">{boss.location}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
    </>
  )
}
