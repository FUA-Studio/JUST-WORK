// JUST WORK — Electron main process
// FUA Studio © 2026
const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 620,
    backgroundColor: '#f6f7fb',
    autoHideMenuBar: true,
    title: 'JUST WORK',
    icon: path.join(__dirname, 'assets', 'logo', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.webContents.openDevTools({ mode: 'detached' });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ---- IPC: read skill definitions bundled in the app ----
function loadSkills(mode) {
  const file = path.join(__dirname, 'assets', 'skills', `${mode}.json`);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return [];
  }
}

ipcMain.handle('skills:list', (_e, mode) => loadSkills(mode));

ipcMain.handle('file:save', async (e, { defaultName, content, ext }) => {
  const res = await dialog.showSaveDialog(win, {
    defaultPath: defaultName || 'output.txt',
    filters: [
      { name: 'All files', extensions: ['*'] },
      { name: ext ? `${ext.toUpperCase()} file` : 'Text', extensions: [ext || 'txt'] }
    ]
  });
  if (!res.canceled && res.filePath) {
    fs.writeFileSync(res.filePath, content, 'utf8');
    return { ok: true, path: res.filePath };
  }
  return { ok: false };
});

ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  name: app.getName(),
  studio: 'FUA Studio'
}));

// ---- App lifecycle ----
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
