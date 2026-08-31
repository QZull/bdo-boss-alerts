import { createDefaultState } from '@shared/defaults'
import type { AppState, ToastPayload } from '@shared/types'
import { playPackedSound } from './audio'

export const fallbackState = createDefaultState()

export async function loadState(): Promise<AppState> {
  try {
    return await window.api.getState()
  } catch {
    return fallbackState
  }
}

export async function persist(state: AppState): Promise<AppState> {
  return window.api.saveState(state)
}

export async function playSound(soundId: string, volume: number): Promise<void> {
  if (soundId === 'silent') return
  const packed = await window.api.getSound(soundId)
  if (!packed) {
    await window.api.playNativeSound(soundId)
    return
  }
  try {
    await playPackedSound(packed.base64, packed.mime, volume)
  } catch {
    await window.api.playNativeSound(soundId)
  }
}

export function subscribe(
  onState: (state: AppState) => void,
  onTick?: (now: number) => void,
  onToast?: (payload: ToastPayload) => void
): () => void {
  const a = window.api.onState(onState)
  const b = onTick ? window.api.onTick(onTick) : () => undefined
  const c = onToast ? window.api.onToast(onToast) : () => undefined
  return () => {
    a()
    b()
    c()
  }
}
