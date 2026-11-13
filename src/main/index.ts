import { app, BrowserWindow, ipcMain } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FocusBrowserResult, LaunchBrowserResult, StopBrowserResult } from '../preload/fp';
import type { Settings } from '../renderer/src/api/settings';

const root = dirname(fileURLToPath(import.meta.url));

// 与 src/renderer/src/api/settings.ts 的 defaultSettings 相同。主进程单独保存，不落盘。
const defaultSettings: Settings = {
  browser_exe: 'D:\\fpconsole-kit\\browser\\chrome.exe',
  kit_dir: 'D:\\fpconsole-kit',
  jump_tcp: '10.0.0.1:443',
  jump_token: 'demo-token',
  jump_attempts: '450',
  jump_wait_ms: '900000',
};

let settings: Settings = { ...defaultSettings };
let nextPid = 12040;

function registerIpc(): void {
  ipcMain.handle('fp:launch-browser', (_event, slot: string): LaunchBrowserResult => {
    const pid = nextPid;
    nextPid += 1;
    return { slot, status: 'running', pid };
  });
  ipcMain.handle('fp:stop-browser', (_event, slot: string): StopBrowserResult => {
    return { slot, stopped: 1 };
  });
  ipcMain.handle('fp:focus-browser', (_event, slot: string): FocusBrowserResult => {
    return { slot, focused: true };
  });
  ipcMain.handle('fp:get-settings', (): Settings => ({ ...settings }));
  ipcMain.handle('fp:save-settings', (_event, next: Settings): Settings => {
    settings = { ...next };
    return { ...settings };
  });
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    backgroundColor: '#0F172A',
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    title: 'PANDA Browser',
    webPreferences: {
      preload: join(root, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(join(root, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
