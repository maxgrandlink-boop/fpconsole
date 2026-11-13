import { contextBridge, ipcRenderer } from 'electron';
import type { Settings } from '../renderer/src/api/settings';
import type { FpApi } from './fp';

const fp: FpApi = {
  launchBrowser(slot) {
    return ipcRenderer.invoke('fp:launch-browser', slot);
  },
  stopBrowser(slot) {
    return ipcRenderer.invoke('fp:stop-browser', slot);
  },
  focusBrowser(slot) {
    return ipcRenderer.invoke('fp:focus-browser', slot);
  },
  getSettings() {
    return ipcRenderer.invoke('fp:get-settings');
  },
  saveSettings(settings: Settings) {
    return ipcRenderer.invoke('fp:save-settings', settings);
  },
};

contextBridge.exposeInMainWorld('fp', fp);
