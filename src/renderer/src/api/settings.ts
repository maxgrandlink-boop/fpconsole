import { delay } from './delay';

export interface Settings {
  browser_exe: string;
  kit_dir: string;
  jump_tcp: string;
  jump_token: string;
  jump_attempts: string;
  jump_wait_ms: string;
}

export const defaultSettings: Settings = {
  browser_exe: 'D:\\fpconsole-kit\\browser\\chrome.exe',
  kit_dir: 'D:\\fpconsole-kit',
  jump_tcp: '10.0.0.1:443',
  jump_token: 'demo-token',
  jump_attempts: '450',
  jump_wait_ms: '900000',
};

let current: Settings = { ...defaultSettings };

/** 同步读取，给命令拼装用。页面请走 getSettings。 */
export function readSettings(): Settings {
  return { ...current };
}

export async function getSettings(): Promise<Settings> {
  await delay();
  return readSettings();
}

export async function saveSettings(next: Settings): Promise<Settings> {
  await delay();
  current = { ...next };
  return readSettings();
}
