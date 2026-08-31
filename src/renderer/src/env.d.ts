import type { AppState, ToastPayload } from '@shared/types'

declare global {
  interface Window {
    api: {
      getState: () => Promise<AppState>
      saveState: (state: AppState) => Promise<AppState>
      pickSound: () => Promise<{ fileName: string; name: string } | null>
      pickImage: () => Promise<string | null>
      getSound: (soundId: string) => Promise<{ base64: string; mime: string } | null>
      playNativeSound: (soundId: string) => Promise<boolean>
      minimize: () => Promise<void>
      hideToTray: () => Promise<void>
      closeToast: () => Promise<void>
      openMain: () => Promise<void>
      pinFlyout: (pinned: boolean) => Promise<void>
      quit: () => Promise<void>
      openData: () => Promise<void>
      testToast: () => Promise<boolean>
      onState: (cb: (state: AppState) => void) => () => void
      onTick: (cb: (now: number) => void) => () => void
      onToast: (cb: (payload: ToastPayload) => void) => () => void
    }
  }
}

export {}
