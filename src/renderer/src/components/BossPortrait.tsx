import type { Boss } from '@shared/types'
import { accent, bossSrc } from '../lib/media'

export function BossPortrait({
  boss,
  size = 44,
  className = ''
}: {
  boss: Boss
  size?: number
  className?: string
}) {
  const ring = accent(boss.color, '#d7c59a')
  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: `0 0 0 1.5px ${ring}`
      }}
      title={boss.name}
    >
      <img src={bossSrc(boss)} alt={boss.name} className="h-full w-full object-cover" draggable={false} />
    </span>
  )
}
