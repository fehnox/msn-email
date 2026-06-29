const { app, BrowserWindow, ipcMain, screen, shell, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const sound = require('sound-play');
const { authenticate, fetchEmails, markAsRead } = require('./mail/gmail');

let mainWindow  = null;
let toastWindow = null;
let gmailAuth   = null;
let checkInterval = null;
let lastEmailIds  = new Set();
let tray = null;

function playSound() {
  try {
    sound.play(path.join(__dirname, 'src/assets/notify.mp3'));
  } catch(e) { console.log('Som indisponivel:', e.message); }
}

function createTray() {
  const iconPath = path.join(__dirname, 'src/assets/tray-icon.png');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir MSN Mail',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      }
    },
    {
      label: 'Verificar emails',
      click: () => refreshEmails()
    },
    { type: 'separator' },
    {
      label: 'Fechar',
      click: () => {
        clearInterval(checkInterval);
        app.quit();
      }
    }
  ]);

  tray.setToolTip('MSN Mail — Fernando Brigida');
  tray.setContextMenu(contextMenu);

  // Clique duplo abre a janela
  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
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

  // Ao fechar a janela, minimiza para bandeja em vez de fechar
  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow.hide();
    tray.displayBalloon({
      title: 'MSN Mail',
      content: 'Rodando em segundo plano. Clique duas vezes no icone para abrir.',
      iconType: 'info'
    });
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function createToast(emailData) {
  if (toastWindow) { toastWindow.close(); toastWindow = null; }
  playSound();

  // Atualiza tooltip da bandeja com contagem
  const unreadCount = [...lastEmailIds].length;
  tray?.setToolTip(`MSN Mail — ${unreadCount} emails`);

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
    checkInterval = setInterval(checkNewEmails, 40 * 1000);
  } catch (err) {
    console.error('Erro Gmail:', err);
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
  } catch (err) {
    console.error('Erro ao buscar emails:', err);
    mainWindow?.webContents.send('loading', false);
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
    console.error('Erro ao verificar emails:', err);
  }
}

ipcMain.on('window-minimize',  () => mainWindow?.minimize());
ipcMain.on('window-maximize',  () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
ipcMain.on('window-close',     () => mainWindow?.hide());
ipcMain.on('toast-close',      () => { toastWindow?.close(); toastWindow = null; });
ipcMain.on('toast-open-email', (_, id) => {
  mainWindow?.webContents.send('open-email', id);
  mainWindow?.show();
  mainWindow?.focus();
  toastWindow?.close(); toastWindow = null;
});
ipcMain.on('refresh-emails',   () => refreshEmails());
ipcMain.on('connect-gmail',    () => initGmail());
ipcMain.on('mark-as-read', async (_, id) => {
  if (gmailAuth) { try { await markAsRead(gmailAuth, id); } catch(e) {} }
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

app.on('window-all-closed', (e) => {
  // Não fecha o app quando a janela fecha — fica na bandeja
});

app.on('before-quit', () => {
  clearInterval(checkInterval);
  tray?.destroy();
});
