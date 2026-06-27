// preload.js — Ponte segura entre Electron e interface
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Controles da janela
  minimize:  () => ipcRenderer.send('window-minimize'),
  maximize:  () => ipcRenderer.send('window-maximize'),
  close:     () => ipcRenderer.send('window-close'),

  // Toast
  toastClose:     ()       => ipcRenderer.send('toast-close'),
  toastOpenEmail: (id)     => ipcRenderer.send('toast-open-email', id),
  onToastData:    (cb)     => ipcRenderer.on('toast-data', (_, data) => cb(data)),

  // Email
  simulateEmail:  ()       => ipcRenderer.send('simulate-email'),
  onOpenEmail:    (cb)     => ipcRenderer.on('open-email', (_, id) => cb(id)),
});
