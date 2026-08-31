import { contextBridge, ipcRenderer } from 'electron'
import type { AppState, ToastPayload } from '../shared/types'

const api = {
  getState: (): Promise<AppState> => ipcRenderer.invoke('state:get'),
  saveState: (state: AppState): Promise<AppState> => ipcRenderer.invoke('state:save', state),
  pickSound: (): Promise<{ fileName: string; name: string } | null> => ipcRenderer.invoke('dialog:sound'),
  pickImage: (): Promise<string | null> => ipcRenderer.invoke('dialog:image'),
  getSound: (soundId: string): Promise<{ base64: string; mime: string } | null> => ipcRenderer.invoke('sound:get', soundId),
  playNativeSound: (soundId: string): Promise<boolean> => ipcRenderer.invoke('sound:native', soundId),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  hideToTray: () => ipcRenderer.invoke('window:hide'),
  closeToast: () => ipcRenderer.invoke('window:close-toast'),
  openMain: () => ipcRenderer.invoke('window:open-main'),
  pinFlyout: (pinned: boolean) => ipcRenderer.invoke('flyout:pin', pinned),
  quit: () => ipcRenderer.invoke('app:quit'),
  openData: () => ipcRenderer.invoke('shell:open-data'),
  testToast: () => ipcRenderer.invoke('toast:test'),
  onState: (cb: (state: AppState) => void) => {
    const listener = (_e: unknown, next: AppState) => cb(next)
    ipcRenderer.on('state:changed', listener)
    return () => ipcRenderer.removeListener('state:changed', listener)
  },
  onTick: (cb: (now: number) => void) => {
    const listener = (_e: unknown, now: number) => cb(now)
    ipcRenderer.on('tick', listener)
    return () => ipcRenderer.removeListener('tick', listener)
  },
  onToast: (cb: (payload: ToastPayload) => void) => {
    const listener = (_e: unknown, payload: ToastPayload) => cb(payload)
    ipcRenderer.on('toast:show', listener)
    return () => ipcRenderer.removeListener('toast:show', listener)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type DesktopApi = typeof api
