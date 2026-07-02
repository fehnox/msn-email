// renderer.js — MSN Mail

let allEmails     = [];
let currentFilter = 'all';
let currentSender = null;
let selectedEmailId = null;
let searchQuery   = '';

function getInitials(name) {
  return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
}

function formatDate(time, date) {
  return date === 'Hoje' ? time : date + ' ' + time;
}

function getFilteredEmails() {
  return allEmails.filter(email => {
    const matchAccount = currentFilter === 'all' || email.account === currentFilter;
    const matchSender  = !currentSender || email.from === currentSender;
    const matchSearch  = !searchQuery ||
      email.from.toLowerCase().includes(searchQuery) ||
      email.subject.toLowerCase().includes(searchQuery) ||
      email.preview.toLowerCase().includes(searchQuery);
    return matchAccount && matchSender && matchSearch;
  });
}

function renderSenders() {
  const list = document.getElementById('senderList');
  const emails = allEmails.filter(e => currentFilter === 'all' || e.account === currentFilter);
  const senderMap = {};
  emails.forEach(e => {
    if (!senderMap[e.from]) senderMap[e.from] = { count: 0, unread: 0 };
    senderMap[e.from].count++;
    if (e.unread) senderMap[e.from].unread++;
  });

  list.innerHTML = `
    <div class="sender-item ${!currentSender ? 'active' : ''}" id="senderAll">
      <div class="sender-avatar" style="background:linear-gradient(135deg,#0078d4,#005a9e)">📬</div>
      <div class="sender-info">
        <div class="sender-name">Todos os emails</div>
        <div class="sender-count">${emails.length} mensagens</div>
      </div>
      ${emails.filter(e=>e.unread).length > 0 ? '<div class="sender-badge">'+emails.filter(e=>e.unread).length+'</div>' : ''}
    </div>
  `;

  Object.entries(senderMap)
    .sort((a,b) => b[1].unread - a[1].unread)
    .forEach(([name, data]) => {
      const item = document.createElement('div');
      item.className = 'sender-item' + (currentSender === name ? ' active' : '');
      item.innerHTML = `
        <div class="sender-avatar">${getInitials(name)}</div>
        <div class="sender-info">
          <div class="sender-name">${name}</div>
          <div class="sender-count">${data.count} email${data.count > 1 ? 's' : ''}</div>
        </div>
        ${data.unread > 0 ? '<div class="sender-badge">'+data.unread+'</div>' : ''}
      `;
      item.addEventListener('click', () => { currentSender = name; renderSenders(); renderEmailList(); });
      list.appendChild(item);
    });

  document.getElementById('senderAll').addEventListener('click', () => {
    currentSender = null; renderSenders(); renderEmailList();
  });
}

function renderEmailList() {
  const list   = document.getElementById('emailList');
  const emails = getFilteredEmails();
  const unread = emails.filter(e => e.unread).length;

  document.getElementById('emailCount').textContent = emails.length + ' email' + (emails.length !== 1 ? 's' : '');
  document.getElementById('panelTitle').textContent =
    currentSender || (currentFilter === 'all' ? 'Todos os emails' : 'Gmail');

  if (emails.length === 0) {
    list.innerHTML = '<div class="loading-state">' +
      (allEmails.length === 0 ? '⏳ Carregando emails...' : '📭 Nenhum email encontrado') +
      '</div>';
    return;
  }

  list.innerHTML = '';
  emails.forEach(email => {
    const item = document.createElement('div');
    item.className = 'email-item' +
      (email.unread ? ' unread' : '') +
      (selectedEmailId === email.id ? ' selected' : '');
    item.dataset.id = email.id;
    item.innerHTML = `
      <div class="email-avatar">${getInitials(email.from)}</div>
      <div class="email-content">
        <div class="email-header">
          <div class="email-from">${email.from}</div>
          <div class="email-time">${formatDate(email.time, email.date)}</div>
        </div>
        <div class="email-subject">${email.subject}</div>
        <div class="email-preview-text">${email.preview}</div>
        <div class="email-footer">
          <span class="email-account-badge badge-gmail">Gmail</span>
        </div>
      </div>
    `;
    item.addEventListener('click', () => openEmail(email.id));
    list.appendChild(item);
  });
}

function openEmail(id) {
  const email = allEmails.find(e => e.id === id);
  if (!email) return;
  email.unread = false;
  selectedEmailId = id;
  window.electronAPI.markAsRead(id);
  renderSenders();
  renderEmailList();

  const preview = document.getElementById('emailPreview');
  preview.innerHTML = `
    <div class="preview-header">
      <div class="preview-subject">${email.subject}</div>
      <div class="preview-meta">
        <div class="preview-meta-row">
          <span class="preview-meta-label">De:</span>
          <span class="preview-meta-value">${email.from} &lt;${email.email}&gt;</span>
        </div>
        <div class="preview-meta-row">
          <span class="preview-meta-label">Para:</span>
          <span class="preview-meta-value">fernando.fehnox@gmail.com</span>
        </div>
        <div class="preview-meta-row">
          <span class="preview-meta-label">Data:</span>
          <span class="preview-meta-value">${email.date} às ${email.time}</span>
        </div>
      </div>
    </div>
    <div class="preview-actions">
      <button class="preview-btn primary">↩ Responder</button>
      <button class="preview-btn">↪ Encaminhar</button>
      <button class="preview-btn">🗑 Excluir</button>
    </div>
    <iframe class="preview-iframe" id="previewFrame" sandbox="allow-same-origin" style="width:100%;flex:1;border:none;min-height:500px;background:white;display:block;"></iframe>
  `;
  // Injeta o HTML no iframe após renderizar
  setTimeout(() => {
    const frame = document.getElementById('previewFrame');
    if (frame) {
      frame.contentDocument.open();
      frame.contentDocument.write(email.body);
      frame.contentDocument.close();
    }
  }, 50);
  updateStatus('Email de ' + email.from + ' aberto');
}

function updateStatus(msg) {
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('statusText').textContent = msg + ' · ' + now;
}

function setLoading(active) {
  const btn = document.getElementById('btnRefresh');
  if (btn) { btn.textContent = active ? '⏳ Carregando...' : '🔄 Verificar'; btn.disabled = active; }
}

// ── EVENTOS ──
document.getElementById('btnMin').addEventListener('click',     () => window.electronAPI.minimize());
document.getElementById('btnMax').addEventListener('click',     () => window.electronAPI.maximize());
document.getElementById('btnClose').addEventListener('click',   () => window.electronAPI.close());
document.getElementById('btnRefresh').addEventListener('click', () => { window.electronAPI.refreshEmails(); updateStatus('Verificando...'); });
document.getElementById('btnSimulate').addEventListener('click',() => window.electronAPI.simulateEmail());
document.getElementById('searchInput').addEventListener('input', (e) => { searchQuery = e.target.value.toLowerCase(); renderEmailList(); });

document.querySelectorAll('.acc-btn:not(#btnAddAccount)').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.acc-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.account;
    currentSender = null;
    renderSenders();
    renderEmailList();
  });
});

// Modal
const modalOverlay = document.getElementById('modalOverlay');
document.getElementById('btnAddAccount').addEventListener('click', () => modalOverlay.classList.add('open'));
document.getElementById('modalClose').addEventListener('click',   () => modalOverlay.classList.remove('open'));
document.getElementById('modalCancel').addEventListener('click',  () => modalOverlay.classList.remove('open'));
document.getElementById('modalConfirm').addEventListener('click', () => {
  const email = document.getElementById('newAccountEmail').value.trim();
  if (!email || !email.includes('@gmail.com')) { alert('Digite um email Gmail válido!'); return; }
  modalOverlay.classList.remove('open');
  updateStatus('Conectando ' + email + '...');
  window.electronAPI.addAccount(email);
});

// Eventos do main
window.electronAPI.onAuthStatus(({ status, message }) => {
  updateStatus(message);
  const dot = document.querySelector('.acc-dot.gmail');
  if (dot) dot.style.background = status === 'connected' ? '#107c10' : status === 'error' ? '#d13438' : '#f7630c';
});
window.electronAPI.onLoading(setLoading);
window.electronAPI.onEmailsLoaded((emails) => {
  allEmails = emails;
  renderSenders();
  renderEmailList();
  const unread = emails.filter(e => e.unread).length;
  updateStatus(emails.length + ' emails' + (unread > 0 ? ' · ' + unread + ' não lidos' : ''));
});
window.electronAPI.onOpenEmail((id) => openEmail(id));

// Init
renderSenders();
renderEmailList();
updateStatus('Conectando ao Gmail...');
