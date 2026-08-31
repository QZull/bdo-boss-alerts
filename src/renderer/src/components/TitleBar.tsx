import { ZoomControls } from './ZoomControls'
import { AppSelect } from './AppSelect'
import { UTC_OFFSET_OPTIONS } from '@shared/utc'

export function TitleBar({
  title,
  uiScale,
  onUiScale,
  utcOffset,
  onUtcOffset
}: {
  title: string
  uiScale: number
  onUiScale: (next: number) => void
  utcOffset: number
  onUtcOffset: (next: number) => void
}) {
  return (
    <header className="drag flex h-14 items-center justify-between border-b border-[var(--color-line)] px-3 py-2">
      <div className="flex items-center gap-3">
        <img src="appmedia://icon/icon.png" alt="" className="no-drag h-7 w-7" />
        <div>
          <div className="font-display text-[15px] tracking-wide text-[var(--color-gold)]">{title}</div>
          <div className="no-drag mt-0.5 flex items-center gap-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">Black Desert · RU ·</span>
            <AppSelect
              fit
              className="rounded-md border border-transparent bg-transparent py-0.5 pl-0.5 pr-0.5 text-[11px] text-[var(--color-gold)] hover:border-[var(--color-line)]"
              value={String(utcOffset)}
              onChange={(value) => onUtcOffset(Number(value))}
              options={UTC_OFFSET_OPTIONS}
            />
          </div>
        </div>
      </div>
      <div className="no-drag flex items-center gap-1">
        <ZoomControls compact value={uiScale} onChange={onUiScale} />
        <span className="mx-1 h-5 w-px bg-[var(--color-line)]" />
        <button className="h-8 w-8 rounded-md text-lg hover:bg-white/5" onClick={() => window.api.minimize()}>
          –
        </button>
        <button className="h-8 w-8 rounded-md text-lg hover:bg-white/5" onClick={() => window.api.hideToTray()} title="Свернуть в трей">
          ×
        </button>
      </div>
    </header>
  )
}
