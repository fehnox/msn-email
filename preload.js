// preload.js — Ponte segura entre Electron e interface (Etapa 2)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize:       () => ipcRenderer.send('window-minimize'),
  maximize:       () => ipcRenderer.send('window-maximize'),
  close:          () => ipcRenderer.send('window-close'),
  connectGmail:   () => ipcRenderer.send('connect-gmail'),
  refreshEmails:  () => ipcRenderer.send('refresh-emails'),
  markAsRead:     (id) => ipcRenderer.send('mark-as-read', id),
  onAuthStatus:   (cb) => ipcRenderer.on('auth-status',   (_, d) => cb(d)),
  onLoading:      (cb) => ipcRenderer.on('loading',       (_, v) => cb(v)),
  onEmailsLoaded: (cb) => ipcRenderer.on('emails-loaded', (_, e) => cb(e)),
  onOpenEmail:    (cb) => ipcRenderer.on('open-email',    (_, id) => cb(id)),
  toastClose:     () => ipcRenderer.send('toast-close'),
  toastOpenEmail: (id) => ipcRenderer.send('toast-open-email', id),
  onToastData:    (cb) => ipcRenderer.on('toast-data',    (_, d) => cb(d)),
  simulateEmail:  () => ipcRenderer.send('simulate-email'),
});
