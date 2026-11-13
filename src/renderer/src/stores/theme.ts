import { defineStore } from 'pinia';
import type { ThemeMode } from '../theme';

const THEME_KEY = 'fpconsole-theme';

export interface ThemeState {
  mode: ThemeMode;
}

function readTheme(): ThemeMode {
  try {
    const value = localStorage.getItem(THEME_KEY);
    if (value === 'dark' || value === 'light') return value;
  } catch {
    // localStorage 不可用时用默认深色
  }
  return 'dark';
}

function writeTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch {
    // 写失败不影响当前界面
  }
}

export const useThemeStore = defineStore('theme', {
  state: (): ThemeState => ({
    mode: readTheme(),
  }),
  actions: {
    setMode(mode: ThemeMode) {
      this.mode = mode;
      writeTheme(mode);
    },
  },
});
