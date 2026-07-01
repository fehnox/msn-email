const { app, BrowserWindow, ipcMain, screen, Tray, Menu } = require('electron');
const path = require('path');
const sound = require('sound-play');
const { authenticate, fetchEmails, markAsRead } = require('./mail/gmail');

let mainWindow    = null;
let toastWindow   = null;
let tray          = null;
let checkInterval = null;
let accounts      = [];
let lastEmailIds  = new Set();
let initialized   = false;

function playSound() {
  try { sound.play(path.join(__dirname, 'src/assets/notify.mp3')); } catch(e) {}
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'src/assets/tray-icon.png'));
  tray.setToolTip('MSN Mail');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { label: 'Verificar emails', click: () => refreshAllEmails() },
    { type: 'separator' },
    { label: 'Fechar', click: () => { clearInterval(checkInterval); app.quit(); } }
  ]));
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
}

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
  mainWindow.on('close', (e) => { e.preventDefault(); mainWindow.hide(); });
}

function createToast(emailData) {
  if (toastWindow) { toastWindow.close(); toastWindow = null; }
  playSound();
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

async function initGmail(tokenFile = 'token.json', accountEmail = null) {
  if (initialized && tokenFile === 'token.json') return;
  if (tokenFile === 'token.json') initialized = true;
  try {
    mainWindow?.webContents.send('auth-status', { status: 'connecting', message: 'Conectando ao Gmail...' });
    const client = await authenticate(tokenFile);
    const email = accountEmail || 'fernando.fehnox@gmail.com';
    accounts.push({ auth: client, email, tokenFile });
    mainWindow?.webContents.send('auth-status', { status: 'connected', message: 'Gmail conectado: ' + email });
    await refreshAllEmails();
    if (!checkInterval) {
      checkInterval = setInterval(checkNewEmails, 40 * 1000);
    }
  } catch (err) {
    console.error('Erro Gmail:', err);
    mainWindow?.webContents.send('auth-status', { status: 'error', message: 'Erro: ' + err.message });
  }
}

async function refreshAllEmails() {
  if (accounts.length === 0) return;
  try {
    mainWindow?.webContents.send('loading', true);
    let allEmails = [];
    const seenIds = new Set();
    for (const acc of accounts) {
      const emails = await fetchEmails(acc.auth, { maxResults: 25 });
      emails.forEach(e => {
        if (!seenIds.has(e.id)) {
          seenIds.add(e.id);
          lastEmailIds.add(e.id);
          e.accountEmail = acc.email;
          allEmails.push(e);
        }
      });
    }
    allEmails.sort((a, b) => new Date(b.raw) - new Date(a.raw));
    mainWindow?.webContents.send('emails-loaded', allEmails);
    mainWindow?.webContents.send('loading', false);
    const unread = allEmails.filter(e => e.unread).length;
    tray?.setToolTip('MSN Mail' + (unread > 0 ? ' - ' + unread + ' nao lidos' : ''));
  } catch (err) {
    console.error('Erro ao buscar emails:', err);
    mainWindow?.webContents.send('loading', false);
  }
}

async function checkNewEmails() {
  if (accounts.length === 0) return;
  try {
    for (const acc of accounts) {
      const emails = await fetchEmails(acc.auth, { maxResults: 5, query: 'is:inbox is:unread newer_than:1m' });
      const newEmails = emails.filter(e => !lastEmailIds.has(e.id));
      if (newEmails.length > 0) {
        newEmails.forEach(email => { lastEmailIds.add(email.id); createToast(email); });
        await refreshAllEmails();
      }
    }
  } catch (err) {
    console.error('Erro ao verificar emails:', err);
  }
}

ipcMain.on('window-minimize',  () => mainWindow?.minimize());
ipcMain.on('window-maximize',  () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
ipcMain.on('window-close',     () => mainWindow?.hide());
ipcMain.on('toast-close',      () => { toastWindow?.close(); toastWindow = null; });
ipcMain.on('toast-open-email', (_, id) => {
  mainWindow?.webContents.send('open-email', id);
  mainWindow?.show(); mainWindow?.focus();
  toastWindow?.close(); toastWindow = null;
});
ipcMain.on('refresh-emails', () => refreshAllEmails());
ipcMain.on('connect-gmail',  () => initGmail());
ipcMain.on('add-account', (_, email) => {
  const jaExiste = accounts.find(a => a.email === email);
  if (jaExiste) {
    mainWindow?.webContents.send('auth-status', { status: 'error', message: 'Conta ' + email + ' ja esta conectada!' });
    return;
  }
  const tokenFile = 'token_' + email.replace('@', '_').replace(/\./g, '_') + '.json';
  initGmail(tokenFile, email);
});
ipcMain.on('mark-as-read', async (_, id) => {
  for (const acc of accounts) {
    try { await markAsRead(acc.auth, id); } catch(e) {}
  }
});
ipcMain.on('simulate-email', () => {
  createToast({
    id: 'test-001', from: 'Meliuz Vagas',
    subject: 'Sua candidatura foi recebida!',
    preview: 'Ola Fernando, recebemos sua inscricao...',
    account: 'gmail',
    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  });
});

app.whenReady().then(() => {
  createTray();
  createMainWindow();
  mainWindow.once('ready-to-show', () => setTimeout(() => initGmail(), 1500));
});
app.on('window-all-closed', () => {});
app.on('before-quit', () => { clearInterval(checkInterval); tray?.destroy(); });
