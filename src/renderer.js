// renderer.js — Lógica da interface MSN Mail (Etapa 2: emails reais)

let allEmails     = [];
let currentFilter = 'all';
let currentSender = null;
let selectedEmailId = null;
let searchQuery   = '';

// ── UTILITÁRIOS ──
function getInitials(name) {
  return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
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

// ── SIDEBAR REMETENTES ──
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
      <div class="sender-avatar">📬</div>
      <div class="sender-info">
        <div class="sender-name">Todos</div>
        <div class="sender-count">${emails.length} emails</div>
      </div>
    </div>
  `;

  Object.entries(senderMap).forEach(([name, data]) => {
    const item = document.createElement('div');
    item.className = `sender-item ${currentSender === name ? 'active' : ''}`;
    item.innerHTML = `
      <div class="sender-avatar">${getInitials(name)}</div>
      <div class="sender-info">
        <div class="sender-name">${name}</div>
        <div class="sender-count">${data.count} email${data.count > 1 ? 's' : ''}</div>
      </div>
      ${data.unread > 0 ? `<div class="sender-badge">${data.unread}</div>` : ''}
    `;
    item.addEventListener('click', () => { currentSender = name; renderSenders(); renderEmailList(); });
    list.appendChild(item);
  });

  document.getElementById('senderAll').addEventListener('click', () => {
    currentSender = null; renderSenders(); renderEmailList();
  });
}

// ── LISTA DE EMAILS ──
function renderEmailList() {
  const list   = document.getElementById('emailList');
  const emails = getFilteredEmails();

  document.getElementById('emailCount').textContent =
    `${emails.length} email${emails.length !== 1 ? 's' : ''}`;
  document.getElementById('panelTitle').textContent =
    currentSender ? currentSender :
    currentFilter === 'all' ? 'Todos os emails' :
    currentFilter === 'gmail' ? 'Gmail' : 'Outlook';

  if (emails.length === 0) {
    list.innerHTML = `<div style="padding:2rem;text-align:center;color:#6a8090;font-size:0.82rem;">
      ${allEmails.length === 0 ? '⏳ Carregando emails...' : 'Nenhum email encontrado'}
    </div>`;
    return;
  }

  list.innerHTML = '';
  emails.forEach(email => {
    const item = document.createElement('div');
    item.className = `email-item ${email.unread ? 'unread' : ''} ${selectedEmailId === email.id ? 'selected' : ''}`;
    item.dataset.id = email.id;
    item.innerHTML = `
      <div class="email-avatar">${getInitials(email.from)}</div>
      <div class="email-content">
        <div class="email-from">${email.from}</div>
        <div class="email-subject">${email.subject}</div>
        <div class="email-preview-text">${email.preview}</div>
      </div>
      <div class="email-meta">
        <div class="email-time">${email.time}</div>
        <div class="email-account-badge badge-${email.account}">
          ${email.account === 'gmail' ? 'Gmail' : 'Outlook'}
        </div>
      </div>
    `;
    item.addEventListener('click', () => openEmail(email.id));
    list.appendChild(item);
  });
}

// ── ABRIR EMAIL ──
function openEmail(id) {
  const email = allEmails.find(e => e.id === id);
  if (!email) return;

  email.unread = false;
  selectedEmailId = id;

  // Marca como lido no Gmail
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
          <span class="preview-meta-label">Conta:</span>
          <span class="preview-meta-value">${email.account === 'gmail' ? '📧 Gmail' : '📨 Outlook'}</span>
        </div>
        <div class="preview-meta-row">
          <span class="preview-meta-label">Data:</span>
          <span class="preview-meta-value">${email.date} · ${email.time}</span>
        </div>
      </div>
    </div>
    <div class="preview-body">${email.body}</div>
  `;

  updateStatus(`Email de ${email.from} aberto`);
}

// ── STATUS BAR ──
function updateStatus(msg) {
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('statusText').textContent = `${msg} · ${now}`;
}

// ── LOADING ──
function setLoading(active) {
  const btn = document.getElementById('btnRefresh');
  btn.textContent = active ? '⏳ Carregando...' : '🔄 Verificar';
  btn.disabled = active;
}

// ── EVENTOS DA INTERFACE ──
document.getElementById('btnMin').addEventListener('click',      () => window.electronAPI.minimize());
document.getElementById('btnMax').addEventListener('click',      () => window.electronAPI.maximize());
document.getElementById('btnClose').addEventListener('click',    () => window.electronAPI.close());
document.getElementById('btnRefresh').addEventListener('click',  () => { window.electronAPI.refreshEmails(); updateStatus('Verificando...'); });
document.getElementById('btnSimulate').addEventListener('click', () => window.electronAPI.simulateEmail());
document.getElementById('searchInput').addEventListener('input', (e) => { searchQuery = e.target.value.toLowerCase(); renderEmailList(); });

document.querySelectorAll('.acc-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.acc-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.account;
    currentSender = null;
    renderSenders();
    renderEmailList();
  });
});

// ── EVENTOS DO MAIN PROCESS ──
window.electronAPI.onAuthStatus(({ status, message }) => {
  updateStatus(message);
  const dot = document.querySelector('.acc-dot.gmail');
  if (dot) {
    dot.style.background = status === 'connected' ? '#5cb85c' :
                           status === 'error'     ? '#d9534f' : '#f79226';
  }
});

window.electronAPI.onLoading(setLoading);

window.electronAPI.onEmailsLoaded((emails) => {
  allEmails = emails;
  renderSenders();
  renderEmailList();
  const unreadCount = emails.filter(e => e.unread).length;
  updateStatus(`${emails.length} emails carregados${unreadCount > 0 ? ` · ${unreadCount} não lidos` : ''}`);
});

window.electronAPI.onOpenEmail((id) => openEmail(id));

// ── INICIALIZAR ──
renderSenders();
renderEmailList();
updateStatus('Conectando ao Gmail...');
