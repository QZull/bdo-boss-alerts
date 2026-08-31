import type { AppState } from '@shared/types'
import { formatCountdown, formatWhen, upcomingGroups } from '@shared/logic'
import { formatUtcOffset } from '@shared/utc'
import { accent } from '../lib/media'
import { BossPortrait } from './BossPortrait'

export function FlyoutPage({ state, now }: { state: AppState; now: number }) {
  const upcoming = upcomingGroups(state, now, 5, true)
  return (
    <div
      className="h-full bg-[var(--color-ink)] p-3"
      onMouseEnter={() => window.api.pinFlyout(true)}
      onMouseLeave={() => window.api.pinFlyout(false)}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="font-display text-lg text-[var(--color-gold)]">Ближайший респ</div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">{formatUtcOffset(state.utcOffset)}</div>
        </div>
        <button
          className="rounded-full border border-[var(--color-line)] px-3 py-1 text-xs"
          onClick={() => window.api.openMain()}
        >
          Карта
        </button>
      </div>
      <div className="space-y-2">
        {upcoming.map((group, index) => (
          <div
            key={`${group.at}-${index}`}
            className={`rounded-2xl border p-3 ${index === 0 ? 'pulse-gold border-[var(--color-gold)] bg-[var(--color-panel-2)]' : 'border-[var(--color-line)] bg-[var(--color-panel)]'}`}
          >
            <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-muted)]">
              <span>{formatWhen(group.at, state.utcOffset)}</span>
              <span className="font-display text-[var(--color-gold)]">{formatCountdown(group.at - now)}</span>
            </div>
            <div className="flex flex-col gap-2">
              {group.bosses.map((boss) => (
                <div key={boss.id} className="flex items-center gap-2">
                  <BossPortrait boss={boss} size={42} />
                  <div className="min-w-0">
                    <div className="truncate font-medium" style={{ color: accent(boss.color) }}>{boss.name}</div>
                    <div className="truncate text-[11px] text-[var(--color-muted)]">{boss.location}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {!upcoming.length ? (
          <div className="rounded-xl border border-[var(--color-line)] p-4 text-sm text-[var(--color-muted)]">
            Нет включённых боссов.
          </div>
        ) : null}
      </div>
    </div>
  )
}
