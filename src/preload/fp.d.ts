import type { Settings } from '../renderer/src/api/settings';

export interface LaunchBrowserResult {
  slot: string;
  status: 'running';
  pid: number;
}

export interface StopBrowserResult {
  slot: string;
  stopped: number;
}

export interface FocusBrowserResult {
  slot: string;
  focused: true;
}

export interface FpApi {
  launchBrowser(slot: string): Promise<LaunchBrowserResult>;
  stopBrowser(slot: string): Promise<StopBrowserResult>;
  focusBrowser(slot: string): Promise<FocusBrowserResult>;
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<Settings>;
}

declare global {
  interface Window {
    fp: FpApi;
  }
}
