// JUST WORK — Electron main process
// FUA Studio © 2026
const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 960,
    minHeight: 620,
    backgroundColor: '#f7f8fa',
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

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ---- IPC: 读取随包分发的技能定义 ----
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

// ---- IPC: 调用 OpenAI 兼容接口（走主进程，避免渲染层 CORS 限制）----
ipcMain.handle('llm:chat', (_e, { base, key, model, messages }) => {
  return new Promise((resolve) => {
    let url;
    try {
      const b = String(base || '').replace(/\/+$/, '');
      url = new URL(/\/chat\/completions$/.test(b) ? b : b + '/chat/completions');
    } catch {
      resolve({ ok: false, error: 'Base URL 格式不对' });
      return;
    }
    const payload = JSON.stringify({ model, messages, temperature: 0.6, stream: false });
    const lib = url.protocol === 'http:' ? http : https;
    const req = lib.request({
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'http:' ? 80 : 443),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        Authorization: 'Bearer ' + (key || '')
      },
      timeout: 120000
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          resolve({ ok: false, error: `HTTP ${res.statusCode}：${data.slice(0, 300)}` });
          return;
        }
        try {
          const j = JSON.parse(data);
          const m = j.choices && j.choices[0] && j.choices[0].message;
          resolve({ ok: true, text: (m && m.content) || data.slice(0, 2000) });
        } catch {
          resolve({ ok: true, text: data });
        }
      });
    });
    req.on('timeout', () => { req.destroy(new Error('请求超时')); });
    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.write(payload);
    req.end();
  });
});

// ---- 生命周期 ----
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
