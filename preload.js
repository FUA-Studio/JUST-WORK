// JUST WORK — preload bridge (contextIsolation-safe)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jw', {
  listSkills: (mode) => ipcRenderer.invoke('skills:list', mode),
  saveFile: (payload) => ipcRenderer.invoke('file:save', payload),
  appInfo: () => ipcRenderer.invoke('app:info'),
  platform: process.platform
});
