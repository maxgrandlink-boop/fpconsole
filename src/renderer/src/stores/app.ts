import { defineStore } from 'pinia';

export interface AppState {
  name: string;
  version: string;
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    name: 'fpconsole',
    version: '0.1.0',
  }),
});
