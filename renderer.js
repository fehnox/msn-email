// renderer.js — Lógica da interface MSN Mail

// ── DADOS MOCK (serão substituídos pela API real na Etapa 2) ──
const mockEmails = [
  {
    id: '001',
    from: 'Méliuz Vagas',
    email: 'vagas@meliuz.com.br',
    subject: 'Sua candidatura foi recebida! 🎉',
    preview: 'Olá Fernando, recebemos sua inscrição para a vaga de Estágio em Prevenção a Fraudes...',
    body: `Olá Fernando,

Recebemos sua inscrição para a vaga de Estágio em Prevenção a Fraudes com IA.

Nossa equipe irá analisar seu perfil e entraremos em contato em breve com os próximos passos do processo seletivo.

Obrigado pelo seu interesse em fazer parte do time Méliuz!

Atenciosamente,
Time de Recrutamento Méliuz`,
    account: 'gmail',
    time: '09:32',
    date: 'Hoje',
    unread: true,
  },
  {
    id: '002',
    from: 'GitHub',
    email: 'noreply@github.com',
    subject: '[fehnox/boot-telegram-vendinhas-herosaga] New star ⭐',
    preview: 'Someone starred your repository boot-telegram-vendinhas-herosaga...',
    body: `Hi fehnox,

Someone just starred your repository!

Repository: boot-telegram-vendinhas-herosaga
Stars: 3

Keep up the great work!

— The GitHub Team`,
    account: 'gmail',
    time: '08:15',
    date: 'Hoje',
    unread: true,
  },
  {
    id: '003',
    from: 'CIEE',
    email: 'oportunidades@ciee.org.br',
    subject: 'Nova vaga compatível com seu perfil',
    preview: 'Fernando, encontramos uma vaga de Estágio em TI que combina com você...',
    body: `Olá Fernando,

Encontramos uma oportunidade que combina com seu perfil:

🏢 Empresa: Empresa de Telecomunicações
📋 Vaga: Estágio em Suporte de TI
🏠 Modalidade: Home Office
💰 Bolsa: R$ 1.200,00 + benefícios

Acesse o portal CIEE para se candidatar!

Equipe CIEE`,
    account: 'outlook',
    time: 'Ontem',
    date: 'Ontem',
    unread: false,
  },
  {
    id: '004',
    from: 'LinkedIn',
    email: 'messages@linkedin.com',
    subject: 'Você tem uma nova mensagem de recrutador',
    preview: 'Um recrutador da Vivo visualizou seu perfil e enviou uma mensagem...',
    body: `Olá Fernando,

Você tem uma nova mensagem no LinkedIn:

De: Ana Paula Silva - Recrutadora @ Vivo
"Olá Fernando! Vi seu perfil e achei muito interessante sua experiência com automação e IA. Temos uma vaga de estágio que pode ser interessante para você. Podemos conversar?"

Acesse o LinkedIn para responder.`,
    account: 'outlook',
    time: 'Ontem',
    date: 'Ontem',
    unread: false,
  },
  {
    id: '005',
    from: 'Cisco Networking Academy',
    email: 'academy@cisco.com',
    subject: 'Novo curso disponível: AI Foundations',
    preview: 'Fernando, um novo curso de Fundamentos de IA está disponível gratuitamente...',
    body: `Olá Fernando,

Um novo curso está disponível gratuitamente para você:

🎓 AI Foundations — Cisco Networking Academy
⏱ Duração: 8 horas
🏆 Certificado incluído

Este curso cobre os fundamentos de Inteligência Artificial e Machine Learning, perfeito para quem quer iniciar na área.

Acesse sua conta para começar!`,
    account: 'gmail',
    time: '2 dias atrás',
    date: '2 dias atrás',
    unread: false,
  },
];

// ── ESTADO ──
let currentFilter = 'all';
let currentSender = null;
let selectedEmailId = null;
let searchQuery = '';

// ── UTILITÁRIOS ──
function getInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function getFilteredEmails() {
  return mockEmails.filter(email => {
    const matchAccount = currentFilter === 'all' || email.account === currentFilter;
    const matchSender  = !currentSender || email.from === currentSender;
    const matchSearch  = !searchQuery ||
      email.from.toLowerCase().includes(searchQuery) ||
      email.subject.toLowerCase().includes(searchQuery) ||
      email.preview.toLowerCase().includes(searchQuery);
    return matchAccount && matchSender && matchSearch;
  });
}

// ── RENDERIZAR SIDEBAR DE REMETENTES ──
function renderSenders() {
  const list = document.getElementById('senderList');
  const emails = mockEmails.filter(e => currentFilter === 'all' || e.account === currentFilter);

  const senderMap = {};
  emails.forEach(e => {
    if (!senderMap[e.from]) senderMap[e.from] = { count: 0, unread: 0 };
    senderMap[e.from].count++;
    if (e.unread) senderMap[e.from].unread++;
  });

  list.innerHTML = `
    <div class="sender-item ${!currentSender ? 'active' : ''}" data-sender="">
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
    item.dataset.sender = name;
    item.innerHTML = `
      <div class="sender-avatar">${getInitials(name)}</div>
      <div class="sender-info">
        <div class="sender-name">${name}</div>
        <div class="sender-count">${data.count} email${data.count > 1 ? 's' : ''}</div>
      </div>
      ${data.unread > 0 ? `<div class="sender-badge">${data.unread}</div>` : ''}
    `;
    item.addEventListener('click', () => {
      currentSender = name || null;
      renderSenders();
      renderEmailList();
    });
    list.appendChild(item);
  });

  // Evento no "Todos"
  list.querySelector('[data-sender=""]').addEventListener('click', () => {
    currentSender = null;
    renderSenders();
    renderEmailList();
  });
}

// ── RENDERIZAR LISTA DE EMAILS ──
function renderEmailList() {
  const list = document.getElementById('emailList');
  const emails = getFilteredEmails();

  document.getElementById('emailCount').textContent = `${emails.length} email${emails.length !== 1 ? 's' : ''}`;
  document.getElementById('panelTitle').textContent =
    currentSender ? currentSender : currentFilter === 'all' ? 'Todos os emails' : currentFilter === 'gmail' ? 'Gmail' : 'Outlook';

  if (emails.length === 0) {
    list.innerHTML = `<div style="padding:2rem;text-align:center;color:#6a8090;font-size:0.82rem;">Nenhum email encontrado</div>`;
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
        <div class="email-account-badge badge-${email.account}">${email.account === 'gmail' ? 'Gmail' : 'Outlook'}</div>
      </div>
    `;
    item.addEventListener('click', () => openEmail(email.id));
    list.appendChild(item);
  });
}

// ── ABRIR EMAIL ──
function openEmail(id) {
  const email = mockEmails.find(e => e.id === id);
  if (!email) return;

  // Marca como lido
  email.unread = false;
  selectedEmailId = id;

  renderSenders();
  renderEmailList();

  // Renderiza preview
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

// ── EVENTOS ──

// Controles da janela
document.getElementById('btnMin').addEventListener('click', () => window.electronAPI.minimize());
document.getElementById('btnMax').addEventListener('click', () => window.electronAPI.maximize());
document.getElementById('btnClose').addEventListener('click', () => window.electronAPI.close());

// Filtro por conta
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

// Botão simular email
document.getElementById('btnSimulate').addEventListener('click', () => {
  window.electronAPI.simulateEmail();
  updateStatus('Notificação de teste enviada...');
});

// Botão verificar
document.getElementById('btnRefresh').addEventListener('click', () => {
  updateStatus('Verificando emails...');
  setTimeout(() => updateStatus('Verificação concluída — nenhum email novo'), 1500);
});

// Busca
document.getElementById('searchInput').addEventListener('input', (e) => {
  searchQuery = e.target.value.toLowerCase();
  renderEmailList();
});

// Abrir email vindo do toast
window.electronAPI.onOpenEmail((id) => openEmail(id));

// ── INICIALIZAR ──
renderSenders();
renderEmailList();
updateStatus('Pronto');
