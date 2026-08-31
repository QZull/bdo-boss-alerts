import type { Boss } from '@shared/types'

export function bossSrc(boss: Pick<Boss, 'image'>): string {
  if (boss.image.startsWith('custom:')) {
    return `appmedia://custom-image/${encodeURIComponent(boss.image.slice(7))}`
  }
  return `appmedia://boss/${encodeURIComponent(boss.image)}`
}

export function accent(color: string, fallback = '#e4c37a'): string {
  return !color || color.toLowerCase() === '#ffffff' ? fallback : color
}

export function viewFromHash(): string {
  return window.location.hash.replace(/^#\/?/, '') || 'schedule'
}
