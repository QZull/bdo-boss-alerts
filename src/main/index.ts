import { extname, join } from 'node:path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  dialog,
  screen,
  protocol,
  shell
} from 'electron'
import { createDefaultState, DEFAULT_BOSSES, BUILTIN_SOUNDS, migrateSoundId, clampUiScale } from '@shared/defaults'
import { upcomingGroups, reminderToastTitle, reminderSeconds } from '@shared/logic'
import { clampUtcOffset, detectUtcOffsetHours } from '@shared/utc'
import type { AppState, ToastPayload } from '@shared/types'

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'appmedia',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, bypassCSP: true }
  }
])
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

const fired = new Set<string>()
let state: AppState
let tray: Tray | undefined
let mainWindow: BrowserWindow | undefined
let flyoutWindow: BrowserWindow | undefined
let toastWindow: BrowserWindow | undefined
let hideFlyoutTimer: NodeJS.Timeout | undefined
let toastHideTimer: NodeJS.Timeout | undefined
let flyoutPinned = false

function isDev(): boolean {
  return !app.isPackaged
}

function portableRoot(): string {
  return process.env.PORTABLE_EXECUTABLE_DIR || join(process.execPath, '..')
}

function portableExe(): string {
  return process.env.PORTABLE_EXECUTABLE_FILE || process.execPath
}

function dataDir(): string {
  const dir = isDev() ? join(app.getAppPath(), 'data') : join(portableRoot(), 'data')
  mkdirSync(dir, { recursive: true })
  mkdirSync(join(dir, 'sounds'), { recursive: true })
  mkdirSync(join(dir, 'images'), { recursive: true })
  return dir
}

function resourcesDir(): string {
  const candidates = [
    join(process.resourcesPath, 'resources'),
    process.resourcesPath,
    join(portableRoot(), 'resources'),
    join(app.getAppPath(), 'resources'),
    join(__dirname, '../../resources')
  ]
  return candidates.find((dir) => existsSync(join(dir, 'sounds', 'sound1.mp3'))) ?? candidates[candidates.length - 1]
}

function statePath(): string {
  return join(dataDir(), 'settings.json')
}

function hydrate(raw: Partial<AppState> | undefined): AppState {
  const base = createDefaultState()
  if (!raw) return base
  const bosses = [...base.bosses]
  for (const incoming of raw.bosses ?? []) {
    const idx = bosses.findIndex((boss) => boss.id === incoming.id)
    if (idx >= 0) {
      const def = DEFAULT_BOSSES.find((boss) => boss.id === incoming.id)
      bosses[idx] = {
        ...bosses[idx],
        ...incoming,
        ...(def && !incoming.custom ? { name: def.name, location: def.location } : {})
      }
    } else {
      bosses.push(incoming)
    }
  }
  for (const def of DEFAULT_BOSSES) {
    if (!bosses.some((boss) => boss.id === def.id)) bosses.push({ ...def })
  }
  return {
    ...base,
    ...raw,
    bosses,
    reminders: (raw.reminders?.length ? raw.reminders : base.reminders).map((item) => ({
      id: item.id,
      soundId: item.soundId === 'inherit' ? 'inherit' : migrateSoundId(item.soundId),
      seconds: reminderSeconds(item as { seconds?: number; minutes?: number })
    })),
    customSounds: raw.customSounds ?? [],
    extraSlots: raw.extraSlots ?? [],
    windowsToast: false,
    toastDurationSeconds: Math.min(120, Math.max(2, Number(raw.toastDurationSeconds ?? base.toastDurationSeconds) || 8)),
    uiScale: clampUiScale(raw.uiScale ?? base.uiScale),
    utcOffset: raw.utcOffset === undefined || raw.utcOffset === null
      ? detectUtcOffsetHours()
      : clampUtcOffset(raw.utcOffset),
    soundId: migrateSoundId(raw.soundId)
  }
}

function loadState(): AppState {
  try {
    if (existsSync(statePath())) {
      return hydrate(JSON.parse(readFileSync(statePath(), 'utf8')))
    }
  } catch {
    /* keep defaults */
  }
  return createDefaultState()
}

function saveState(): void {
  writeFileSync(statePath(), JSON.stringify(state, null, 2), 'utf8')
}

function applyUiScale(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.setZoomFactor(clampUiScale(state?.uiScale ?? 1))
}

function applyAutostart(enabled: boolean): void {
  if (!app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: false })
    return
  }
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: portableExe()
  })
}

function preloadPath(): string {
  return join(__dirname, '../preload/index.mjs')
}

function rendererUrl(hash: string): { url?: string; file?: string; hash: string } {
  if (isDev() && process.env['ELECTRON_RENDERER_URL']) {
    return { url: `${process.env['ELECTRON_RENDERER_URL']}#/${hash}`, hash }
  }
  return { file: join(__dirname, '../renderer/index.html'), hash }
}

function webPrefs(): Electron.WebPreferences {
  return {
    preload: preloadPath(),
    contextIsolation: true,
    sandbox: false,
    backgroundThrottling: false,
    autoplayPolicy: 'no-user-gesture-required'
  }
}

function loadView(win: BrowserWindow, hash: string): void {
  const target = rendererUrl(hash)
  if (target.url) win.loadURL(target.url)
  else win.loadFile(target.file!, { hash: `/${hash}` })
}

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    frame: false,
    backgroundColor: '#07070b',
    autoHideMenuBar: true,
    icon: join(resourcesDir(), 'icon.png'),
    webPreferences: webPrefs()
  })
  loadView(win, 'schedule')
  const apply = () => applyUiScale()
  win.webContents.on('did-finish-load', apply)
  win.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      win.hide()
    }
  })
  return win
}

function createFlyout(): BrowserWindow {
  const win = new BrowserWindow({
    width: 420,
    height: 560,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    fullscreenable: false,
    backgroundColor: '#07070b',
    transparent: false,
    webPreferences: webPrefs()
  })
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  loadView(win, 'flyout')
  win.on('blur', () => {
    if (!flyoutPinned) scheduleHideFlyout(250)
  })
  return win
}

function createToast(): BrowserWindow {
  const win = new BrowserWindow({
    width: 380,
    height: 92,
    show: false,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    fullscreenable: false,
    focusable: true,
    backgroundColor: '#07070b',
    type: 'toolbar',
    webPreferences: webPrefs()
  })
  win.setAlwaysOnTop(true, 'screen-saver', 1)
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  loadView(win, 'toast')
  return win
}

function positionFlyout(): void {
  if (!flyoutWindow || !tray) return
  const bounds = tray.getBounds()
  const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y })
  const { width, height } = flyoutWindow.getBounds()
  let x = Math.round(bounds.x + bounds.width / 2 - width / 2)
  let y = bounds.y > display.bounds.y + 80 ? bounds.y - height - 10 : bounds.y + bounds.height + 10
  x = Math.min(Math.max(display.workArea.x + 8, x), display.workArea.x + display.workArea.width - width - 8)
  y = Math.min(Math.max(display.workArea.y + 8, y), display.workArea.y + display.workArea.height - height - 8)
  flyoutWindow.setPosition(x, y, false)
}

function positionToast(): void {
  if (!toastWindow) return
  const display = screen.getPrimaryDisplay()
  const { width, height } = toastWindow.getBounds()
  const x = display.workArea.x + display.workArea.width - width - 16
  const y = display.workArea.y + display.workArea.height - height - 16
  toastWindow.setPosition(x, y, false)
}

function scheduleHideFlyout(ms = 400): void {
  clearTimeout(hideFlyoutTimer)
  hideFlyoutTimer = setTimeout(() => {
    if (flyoutPinned) return
    const point = screen.getCursorScreenPoint()
    if (tray && inBounds(tray.getBounds(), point)) return
    if (flyoutWindow?.isVisible() && inBounds(flyoutWindow.getBounds(), point)) return
    flyoutWindow?.hide()
  }, ms)
}

function inBounds(b: Electron.Rectangle, p: Electron.Point): boolean {
  return p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height
}

function showFlyout(): void {
  if (!flyoutWindow) return
  positionFlyout()
  if (!flyoutWindow.isVisible()) {
    flyoutWindow.showInactive()
    flyoutWindow.webContents.send('state:changed', state)
  }
}

function toggleMain(): void {
  if (!mainWindow) return
  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    mainWindow.show()
    mainWindow.focus()
  }
}

function updateTrayTip(): void {
  if (!tray) return
  const next = upcomingGroups(state, Date.now(), 2, true)
  if (!next.length) {
    tray.setToolTip('Респ боссов — нет ближайших')
    return
  }
  const names = next[0].bosses.map((boss) => boss.name).join(', ')
  const mins = Math.max(0, Math.round((next[0].at - Date.now()) / 60000))
  const remain = mins < 1 ? 'через меньше минуты' : `через ${mins} мин`
  tray.setToolTip(`Респ боссов\n${names}\n${remain}`)
}

function broadcast(): void {
  for (const win of [mainWindow, flyoutWindow, toastWindow]) {
    win?.webContents.send('state:changed', state)
  }
  updateTrayTip()
}

function cacheBuiltinSounds(): void {
  const destDir = join(dataDir(), 'builtin-sounds')
  mkdirSync(destDir, { recursive: true })
  const srcDir = join(resourcesDir(), 'sounds')
  for (const item of BUILTIN_SOUNDS) {
    if (!('file' in item) || !item.file) continue
    const src = join(srcDir, item.file)
    if (existsSync(src)) copyFileSync(src, join(destDir, item.file))
  }
}

function resolveSound(soundId: string): string | null {
  const id = soundId === 'inherit' ? state.soundId : soundId
  if (!id || id === 'silent') return null
  const custom = state.customSounds.find((item) => item.id === id)
  if (custom) {
    const customPath = join(dataDir(), 'sounds', custom.fileName)
    return existsSync(customPath) ? customPath : null
  }
  const builtin = BUILTIN_SOUNDS.find((item) => item.id === id)
  const fileName = builtin && 'file' in builtin && builtin.file ? builtin.file : `${id}.mp3`
  const places = [
    join(resourcesDir(), 'sounds', fileName),
    join(dataDir(), 'builtin-sounds', fileName),
    join(app.getAppPath(), 'resources', 'sounds', fileName)
  ]
  return places.find((file) => existsSync(file)) ?? null
}

function mimeFor(file: string): string {
  switch (extname(file).toLowerCase()) {
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.webp':
      return 'image/webp'
    case '.gif':
      return 'image/gif'
    case '.wav':
      return 'audio/wav'
    case '.mp3':
      return 'audio/mpeg'
    case '.ogg':
      return 'audio/ogg'
    case '.m4a':
      return 'audio/mp4'
    case '.flac':
      return 'audio/flac'
    default:
      return 'application/octet-stream'
  }
}

function packSound(soundId: string): { base64: string; mime: string } | null {
  const file = resolveSound(soundId)
  if (!file || !existsSync(file)) return null
  return { base64: readFileSync(file).toString('base64'), mime: mimeFor(file) }
}

function playWavFallback(file: string): void {
  const powershell = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
  spawn(
    powershell,
    [
      '-NoProfile',
      '-WindowStyle',
      'Hidden',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      '(New-Object System.Media.SoundPlayer $env:BDO_BOSS_SOUND).PlaySync()'
    ],
    {
      windowsHide: true,
      stdio: 'ignore',
      env: { ...process.env, BDO_BOSS_SOUND: file }
    }
  )
}

function toastDurationMs(): number {
  return Math.min(120000, Math.max(2000, (state.toastDurationSeconds || 8) * 1000))
}

function ensureToastWindow(): BrowserWindow | undefined {
  if (!toastWindow || toastWindow.isDestroyed()) {
    toastWindow = createToast()
  }
  return toastWindow
}

function raiseToast(): void {
  const win = ensureToastWindow()
  if (!win) return
  positionToast()
  // Windows often drops TOPMOST after hide(); re-assert on every show.
  win.setAlwaysOnTop(false)
  win.setAlwaysOnTop(true, 'screen-saver', 1)
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.showInactive()
  win.setAlwaysOnTop(true, 'screen-saver', 1)
  win.moveTop()
}

function showToast(payload: ToastPayload): void {
  const win = ensureToastWindow()
  if (!win) return
  const packed = packSound(payload.soundId)
  const next: ToastPayload = packed
    ? { ...payload, durationMs: toastDurationMs(), soundBase64: packed.base64, soundMime: packed.mime }
    : { ...payload, durationMs: toastDurationMs() }
  win.webContents.setAudioMuted(false)
  raiseToast()
  win.webContents.send('toast:show', next)
  clearTimeout(toastHideTimer)
  toastHideTimer = setTimeout(() => toastWindow?.hide(), next.durationMs)
}

function tick(): void {
  const now = Date.now()
  const horizonSec = Math.max(0, ...state.reminders.map((item) => reminderSeconds(item)))
  const upcoming = upcomingGroups(state, now, 40, true)
  updateTrayTip()
  flyoutWindow?.webContents.send('tick', now)
  mainWindow?.webContents.send('tick', now)

  for (const group of upcoming) {
    const remain = group.at - now
    if (remain > horizonSec * 1000 + 5000) continue
    for (const reminder of state.reminders) {
      const secs = reminderSeconds(reminder)
      const fireAt = group.at - secs * 1000
      if (now < fireAt || now > fireAt + 1800) continue
      const key = `${group.day}|${group.time}|${group.at}|${reminder.id}`
      if (fired.has(key)) continue
      fired.add(key)
      const names = group.bosses.map((boss) => boss.name).join(', ')
      const payload: ToastPayload = {
        title: reminderToastTitle(secs),
        body: names,
        minutes: Math.round(secs / 60),
        bosses: group.bosses,
        soundId: reminder.soundId === 'inherit' ? state.soundId : reminder.soundId,
        volume: state.volume,
        durationMs: toastDurationMs()
      }
      showToast(payload)
    }
  }

  if (fired.size > 400) fired.clear()
}

function registerIpc(): void {
  ipcMain.handle('state:get', () => state)
  ipcMain.handle('state:save', (_e, next: AppState) => {
    state = hydrate(next)
    saveState()
    applyAutostart(state.autostart)
    applyUiScale()
    broadcast()
    return state
  })
  ipcMain.handle('dialog:sound', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Выберите звук уведомления',
      filters: [{ name: 'Аудио', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths[0]) return null
    const src = result.filePaths[0]
    const ext = src.split('.').pop() ?? 'wav'
    const fileName = `${Date.now()}.${ext}`
    copyFileSync(src, join(dataDir(), 'sounds', fileName))
    return { fileName, name: src.split(/[/\\]/).pop() ?? fileName }
  })
  ipcMain.handle('dialog:image', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Выберите изображение босса',
      filters: [{ name: 'Изображения', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths[0]) return null
    const src = result.filePaths[0]
    const ext = src.split('.').pop() ?? 'png'
    const fileName = `${Date.now()}.${ext}`
    copyFileSync(src, join(dataDir(), 'images', fileName))
    return fileName
  })
  ipcMain.handle('sound:get', (_e, soundId: string) => packSound(soundId))
  ipcMain.handle('sound:native', (_e, soundId: string) => {
    const file = resolveSound(soundId)
    if (file && existsSync(file) && extname(file).toLowerCase() === '.wav') playWavFallback(file)
    return true
  })
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:hide', () => mainWindow?.hide())
  ipcMain.handle('window:close-toast', () => {
    clearTimeout(toastHideTimer)
    toastWindow?.hide()
  })
  ipcMain.handle('window:open-main', () => {
    clearTimeout(toastHideTimer)
    toastWindow?.hide()
    mainWindow?.show()
    mainWindow?.focus()
  })
  ipcMain.handle('flyout:pin', (_e, pinned: boolean) => {
    flyoutPinned = pinned
  })
  ipcMain.handle('app:quit', () => {
    app.isQuitting = true
    app.quit()
  })
  ipcMain.handle('shell:open-data', () => shell.openPath(dataDir()))
  ipcMain.handle('toast:test', () => {
    const upcoming = upcomingGroups(state, Date.now(), 1, false)
    const bosses = upcoming[0]?.bosses?.length
      ? upcoming[0].bosses
      : state.bosses.filter((boss) => boss.enabled).slice(0, 2)
    showToast({
      title: 'Тестовое уведомление',
      body: bosses.map((boss) => boss.name).join(', '),
      minutes: 5,
      bosses,
      soundId: state.soundId,
      volume: state.volume,
      durationMs: toastDurationMs()
    })
    return true
  })
}

function registerProtocol(): void {
  protocol.handle('appmedia', async (request) => {
    const url = new URL(request.url)
    const kind = url.hostname
    const name = decodeURIComponent(url.pathname.replace(/^\//, ''))
    let file = ''
    if (kind === 'boss') file = join(resourcesDir(), 'bosses', name)
    if (kind === 'sound') file = join(resourcesDir(), 'sounds', name)
    if (kind === 'custom-image') file = join(dataDir(), 'images', name)
    if (kind === 'custom-sound') file = join(dataDir(), 'sounds', name)
    if (kind === 'icon') file = join(resourcesDir(), 'icon.png')
    if (!file || !existsSync(file)) return new Response('not found', { status: 404 })
    const body = readFileSync(file)
    return new Response(body, {
      headers: {
        'Content-Type': mimeFor(file),
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      }
    })
  })
}

function setupTray(): void {
  const icon = nativeImage.createFromPath(join(resourcesDir(), 'icon.png')).resize({ width: 16, height: 16 })
  tray = new Tray(icon)
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Расписание', click: () => { mainWindow?.show(); mainWindow?.focus() } },
      { type: 'separator' },
      { label: 'Выход', click: () => { app.isQuitting = true; app.quit() } }
    ])
  )
  tray.on('click', () => toggleMain())
  updateTrayTip()
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })

  app.whenReady().then(() => {
    app.setAppUserModelId('ru.bdo.bossalerts')
    registerProtocol()
    state = loadState()
    cacheBuiltinSounds()
    applyAutostart(state.autostart)
    registerIpc()
    mainWindow = createMainWindow()
    flyoutWindow = createFlyout()
    toastWindow = createToast()
    setupTray()
    mainWindow.once('ready-to-show', () => mainWindow?.show())
    setInterval(tick, 1000)
    tick()
  })
}

app.on('window-all-closed', () => {
  /* stay in tray */
})

declare module 'electron' {
  interface App {
    isQuitting?: boolean
  }
}
