import { defineStore } from 'pinia';
import type { ThemeMode } from '../theme';

export interface ThemeState {
  mode: ThemeMode;
}

export const useThemeStore = defineStore('theme', {
  state: (): ThemeState => ({
    mode: 'dark',
  }),
  actions: {
    setMode(mode: ThemeMode) {
      this.mode = mode;
    },
  },
});
