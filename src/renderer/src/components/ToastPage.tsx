import { useEffect, useState } from 'react'
import type { ToastPayload } from '@shared/types'
import { accent } from '../lib/media'
import { playPackedSound } from '../lib/audio'
import { BossPortrait } from './BossPortrait'

export function ToastPage() {
  const [payload, setPayload] = useState<ToastPayload | null>(null)

  useEffect(() => {
    return window.api.onToast((next) => {
      setPayload(next)
      if (!next.soundBase64 || !next.soundMime) {
        void window.api.playNativeSound(next.soundId)
        return
      }
      void playPackedSound(next.soundBase64, next.soundMime, next.volume).catch(() => {
        void window.api.playNativeSound(next.soundId)
      })
    })
  }, [])

  useEffect(() => {
    if (!payload) return
    const t = window.setTimeout(() => window.api.closeToast(), payload.durationMs || 8000)
    return () => window.clearTimeout(t)
  }, [payload])

  if (!payload) {
    return <div className="h-full bg-[var(--color-ink)]" />
  }

  return (
    <button
      className="flex h-full w-full items-center gap-3 bg-[var(--color-panel)] px-3 text-left ring-1 ring-inset ring-[var(--color-gold)]"
      onClick={() => window.api.openMain()}
    >
      <div className="flex shrink-0">
        {payload.bosses.slice(0, 3).map((boss, index) => (
          <span key={boss.id} className={index ? '-ml-2.5' : ''} style={{ zIndex: 10 - index }}>
            <BossPortrait boss={boss} size={44} />
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-gold)]">{payload.title}</div>
        <div className="truncate font-display text-[17px] leading-tight">
          {payload.bosses.map((boss, i) => (
            <span key={boss.id} style={{ color: accent(boss.color) }}>
              {i ? ' · ' : ''}
              {boss.name}
            </span>
          ))}
        </div>
      </div>
    </button>
  )
}
