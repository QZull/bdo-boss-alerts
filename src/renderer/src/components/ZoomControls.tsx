import { clampUiScale, UI_SCALE_MAX, UI_SCALE_MIN, UI_SCALE_STEP } from '@shared/defaults'

export function ZoomControls({
  value,
  onChange,
  compact = false
}: {
  value: number
  onChange: (next: number) => void
  compact?: boolean
}) {
  const percent = Math.round(clampUiScale(value) * 100)
  const scale = clampUiScale(value)
  const btn = compact
    ? 'flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-white/5 disabled:opacity-30'
    : 'flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-line)] text-lg hover:border-[var(--color-gold)] disabled:opacity-30'

  return (
    <div className={`flex items-center ${compact ? 'gap-0.5' : 'gap-2'}`}>
      <button
        type="button"
        className={btn}
        title="Мельче"
        disabled={scale <= UI_SCALE_MIN}
        onClick={() => onChange(clampUiScale(scale - UI_SCALE_STEP))}
      >
        −
      </button>
      <button
        type="button"
        className={compact
          ? 'min-w-[3.2rem] rounded-md px-1 py-1 text-center text-xs tabular-nums text-[var(--color-gold)] hover:bg-white/5'
          : 'min-w-[4rem] rounded-lg border border-[var(--color-line)] px-2 py-2 text-center text-sm tabular-nums text-[var(--color-gold)] hover:border-[var(--color-gold)]'}
        title="Сбросить на 100%"
        onClick={() => onChange(1)}
      >
        {percent}%
      </button>
      <button
        type="button"
        className={btn}
        title="Крупнее"
        disabled={scale >= UI_SCALE_MAX}
        onClick={() => onChange(clampUiScale(scale + UI_SCALE_STEP))}
      >
        +
      </button>
    </div>
  )
}
