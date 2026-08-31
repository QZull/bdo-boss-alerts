import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type AppOption = { value: string; label: string }

export function AppSelect({
  value,
  onChange,
  options,
  wrapClassName = '',
  className = '',
  fit = false
}: {
  value: string
  onChange: (value: string) => void
  options: AppOption[]
  wrapClassName?: string
  className?: string
  fit?: boolean
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 240 })
  const selected = options.find((item) => item.value === value) ?? options[0]

  const place = () => {
    const rect = btnRef.current?.getBoundingClientRect()
    if (!rect) return
    const spaceBelow = window.innerHeight - rect.bottom - 8
    const spaceAbove = rect.top - 8
    const want = Math.min(280, Math.max(options.length * 34 + 8, 80))
    const openUp = spaceBelow < 140 && spaceAbove > spaceBelow
    const maxHeight = Math.min(want, openUp ? spaceAbove : spaceBelow, 280)
    setPos({
      left: rect.left,
      width: Math.max(rect.width, 120),
      top: openUp ? rect.top - maxHeight - 4 : rect.bottom + 4,
      maxHeight: Math.max(80, maxHeight)
    })
  }

  useLayoutEffect(() => {
    if (!open) return
    place()
    requestAnimationFrame(() => {
      menuRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
    })
  }, [open, options.length])

  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onReposition = () => place()
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open])

  return (
    <div className={`relative min-w-0 ${fit ? 'inline-flex w-auto' : ''} ${wrapClassName}`}>
      <button
        ref={btnRef}
        type="button"
        className={`flex items-center text-left ${fit ? 'w-auto gap-1' : 'w-full justify-between gap-3'} ${className}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 truncate">{selected?.label ?? ''}</span>
        <svg
          className="h-2 w-2.5 shrink-0 fill-[var(--color-gold)]"
          viewBox="0 0 12 8"
          aria-hidden
        >
          <path d="M2 1.5 6 5.5 10 1.5 11 2.5 6 7.5 1 2.5z" />
        </svg>
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[9999] overflow-auto rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
              style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
            >
              {options.map((item) => {
                const active = item.value === value
                return (
                  <button
                    key={item.value}
                    type="button"
                    className={`block w-full px-3 py-1.5 text-left text-sm ${
                      active
                        ? 'bg-[rgb(228_195_122/0.18)] text-[var(--color-gold)]'
                        : 'text-[var(--color-cream)] hover:bg-[rgb(228_195_122/0.1)]'
                    }`}
                    data-active={active ? 'true' : undefined}
                    onClick={() => {
                      onChange(item.value)
                      setOpen(false)
                    }}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
