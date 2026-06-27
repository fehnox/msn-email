// main.js — Processo principal do MSN Mail
const { app, BrowserWindow, ipcMain, Notification, screen } = require('electron');
const path = require('path');

let mainWindow = null;
let toastWindow = null;

// ── JANELA PRINCIPAL ──
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 700,
    minHeight: 500,
    frame: false,          // sem barra padrão do SO — vamos fazer a nossa
    backgroundColor: '#0d2137',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'src/assets/icon.png'),
    show: false,
  });

  mainWindow.loadFile('src/index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── JANELA TOAST (popup estilo MSN) ──
function createToast(emailData) {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  toastWindow = new BrowserWindow({
    width: 320,
    height: 110,
    x: width - 330,
    y: height - 120,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  toastWindow.loadFile('src/toast.html');

  toastWindow.once('ready-to-show', () => {
    toastWindow.show();
    // Envia dados do email para o toast
    toastWindow.webContents.send('toast-data', emailData);

    // Fecha automaticamente após 6 segundos
    setTimeout(() => {
      if (toastWindow) {
        toastWindow.close();
        toastWindow = null;
      }
    }, 6000);
  });
}

// ── IPC: comunicação entre janelas ──

// Controles da janela (minimizar, maximizar, fechar)
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());

// Fechar toast ao clicar
ipcMain.on('toast-close', () => {
  toastWindow?.close();
  toastWindow = null;
});

// Abrir email ao clicar no toast
ipcMain.on('toast-open-email', (_, emailId) => {
  mainWindow?.webContents.send('open-email', emailId);
  mainWindow?.focus();
  toastWindow?.close();
  toastWindow = null;
});

// Simular chegada de email (para testar o toast)
ipcMain.on('simulate-email', () => {
  createToast({
    id: 'test-001',
    from: 'Méliuz <vagas@meliuz.com.br>',
    subject: 'Sua candidatura foi recebida! 🎉',
    preview: 'Olá Fernando, recebemos sua inscrição para a vaga de Estágio...',
    account: 'Gmail',
    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  });
});

// ── APP LIFECYCLE ──
app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
