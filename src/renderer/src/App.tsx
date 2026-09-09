import { useEffect, useState } from 'react'
import type { AppState } from '@shared/types'
import { clampUiScale, UI_SCALE_STEP } from '@shared/defaults'
import { clampUtcOffset } from '@shared/utc'
import { viewFromHash } from './lib/media'
import { loadState, persist, subscribe } from './lib/store'
import { TitleBar } from './components/TitleBar'
import { SchedulePage } from './components/SchedulePage'
import { SettingsPage } from './components/SettingsPage'
import { FlyoutPage } from './components/FlyoutPage'
import { ToastPage } from './components/ToastPage'

export default function App() {
  const [view, setView] = useState(viewFromHash)
  const [page, setPage] = useState<'schedule' | 'settings'>('schedule')
  const [state, setState] = useState<AppState | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const onHash = () => setView(viewFromHash())
    window.addEventListener('hashchange', onHash)
    loadState().then(setState)
    const stop = subscribe(setState, (value) => {
      if (viewFromHash() === 'toast') return
      setNow(value)
    })
    return () => {
      window.removeEventListener('hashchange', onHash)
      stop()
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      const zoomIn = e.key === '+' || e.key === '=' || e.code === 'NumpadAdd'
      const zoomOut = e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract'
      const reset = e.key === '0' || e.code === 'Numpad0'
      if (!zoomIn && !zoomOut && !reset) return
      e.preventDefault()
      setState((current) => {
        if (!current) return current
        const uiScale = reset
          ? 1
          : clampUiScale(current.uiScale + (zoomIn ? UI_SCALE_STEP : -UI_SCALE_STEP))
        const next = { ...current, uiScale }
        void persist(next)
        return next
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (view === 'toast') return <ToastPage />
  if (!state) {
    return <div className="flex h-full items-center justify-center text-[var(--color-muted)]">Загрузка…</div>
  }
  if (view === 'flyout') return <FlyoutPage state={state} now={now} />

  const save = async (next: AppState) => {
    setState(next)
    await persist(next)
  }

  const setScale = (uiScale: number) => {
    void save({ ...state, uiScale: clampUiScale(uiScale) })
  }

  return (
    <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top,rgba(228,195,122,0.08),transparent_42%),linear-gradient(180deg,#0c0d12,#07070b)]">
      <TitleBar
        title="Респ боссов"
        uiScale={state.uiScale}
        onUiScale={setScale}
        utcOffset={state.utcOffset}
        onUtcOffset={(utcOffset) => void save({ ...state, utcOffset: clampUtcOffset(utcOffset) })}
      />
      <main className="min-h-0 flex-1">
        {page === 'settings' ? (
          <SettingsPage state={state} onChange={save} onBack={() => setPage('schedule')} />
        ) : (
          <SchedulePage state={state} now={now} onOpenSettings={() => setPage('settings')} />
        )}
      </main>
    </div>
  )
}
