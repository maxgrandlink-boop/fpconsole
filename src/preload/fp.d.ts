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

export interface FpApi {
  launchBrowser(slot: string): Promise<LaunchBrowserResult>;
  stopBrowser(slot: string): Promise<StopBrowserResult>;
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<Settings>;
}

declare global {
  interface Window {
    fp: FpApi;
  }
}
