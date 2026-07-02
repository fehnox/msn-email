// main.js — Processo principal do MSN Mail (Etapa 2: Gmail integrado)
const { app, BrowserWindow, ipcMain, screen, shell } = require('electron');
const path = require('path');
const { authenticate, fetchEmails, markAsRead } = require('./mail/gmail');

let mainWindow  = null;
let toastWindow = null;
let gmailAuth   = null;
let checkInterval = null;
let lastEmailIds  = new Set();

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 900, height: 650, minWidth: 700, minHeight: 500,
    frame: false, backgroundColor: '#0d2137',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
    },
    show: false,
  });
  mainWindow.loadFile('src/index.html');
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

function createToast(emailData) {
  if (toastWindow) { toastWindow.close(); toastWindow = null; }
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  toastWindow = new BrowserWindow({
    width: 320, height: 110,
    x: width - 330, y: height - 120,
    frame: false, transparent: true,
    alwaysOnTop: true, skipTaskbar: true, resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
    },
    show: false,
  });
  toastWindow.loadFile('src/toast.html');
  toastWindow.once('ready-to-show', () => {
    toastWindow.show();
    toastWindow.webContents.send('toast-data', emailData);
    setTimeout(() => { toastWindow?.close(); toastWindow = null; }, 6000);
  });
}

async function initGmail() {
  try {
    mainWindow?.webContents.send('auth-status', { status: 'connecting', message: 'Conectando ao Gmail...' });
    gmailAuth = await authenticate();
    mainWindow?.webContents.send('auth-status', { status: 'connected', message: 'Gmail conectado!' });
    await refreshEmails();
    checkInterval = setInterval(checkNewEmails, 2 * 60 * 1000);
  } catch (err) {
    console.error('Erro ao autenticar Gmail:', err);
    mainWindow?.webContents.send('auth-status', { status: 'error', message: 'Erro: ' + err.message });
  }
}

async function refreshEmails() {
  if (!gmailAuth) return;
  try {
    mainWindow?.webContents.send('loading', true);
    const emails = await fetchEmails(gmailAuth, { maxResults: 25 });
    emails.forEach(e => lastEmailIds.add(e.id));
    mainWindow?.webContents.send('emails-loaded', emails);
    mainWindow?.webContents.send('loading', false);
    return emails;
  } catch (err) {
    console.error('Erro ao buscar emails:', err);
    mainWindow?.webContents.send('loading', false);
    mainWindow?.webContents.send('auth-status', { status: 'error', message: 'Erro ao buscar emails' });
  }
}

async function checkNewEmails() {
  if (!gmailAuth) return;
  try {
    const emails = await fetchEmails(gmailAuth, { maxResults: 5, query: 'is:inbox is:unread newer_than:5m' });
    const newEmails = emails.filter(e => !lastEmailIds.has(e.id));
    if (newEmails.length > 0) {
      newEmails.forEach(email => { lastEmailIds.add(email.id); createToast(email); });
      await refreshEmails();
    }
  } catch (err) {
    console.error('Erro ao verificar novos emails:', err);
  }
}

ipcMain.on('window-minimize',  () => mainWindow?.minimize());
ipcMain.on('window-maximize',  () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
ipcMain.on('window-close',     () => { clearInterval(checkInterval); mainWindow?.close(); });
ipcMain.on('toast-close',      () => { toastWindow?.close(); toastWindow = null; });
ipcMain.on('toast-open-email', (_, id) => {
  mainWindow?.webContents.send('open-email', id);
  mainWindow?.focus();
  toastWindow?.close(); toastWindow = null;
});
ipcMain.on('refresh-emails',   () => refreshEmails());
ipcMain.on('connect-gmail',    () => initGmail());
ipcMain.on('mark-as-read', async (_, id) => {
  if (gmailAuth) { try { await markAsRead(gmailAuth, id); } catch(e) { console.error(e); } }
});
ipcMain.on('simulate-email', () => {
  createToast({
    id: 'test-001', from: 'Méliuz Vagas',
    subject: 'Sua candidatura foi recebida! 🎉',
    preview: 'Olá Fernando, recebemos sua inscrição para a vaga...',
    account: 'gmail',
    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  });
});

app.whenReady().then(() => {
createMainWindow();
mainWindow = new BrowserWindow({
  width: 900, height: 650, minWidth: 700, minHeight: 500,
  frame: false, backgroundColor: '#0d2137',
  icon: path.join(__dirname, 'src/assets/icon.png'),  // ← adiciona aqui
  webPreferences: { ... }