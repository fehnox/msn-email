# 📧 MSN Mail

Cliente de email desktop com visual inspirado no MSN Messenger, construído com Electron.

## ✨ Funcionalidades

- 📬 Suporte a múltiplas contas (Gmail + Outlook)
- 🔔 Notificação popup estilo MSN ao receber emails
- 👤 Organização por remetente na sidebar
- 🔍 Busca em tempo real
- 👁 Preview de email no painel lateral
- 🎨 Visual MSN Messenger com degradê azul clássico

## 🚀 Como rodar

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm start
```

## 📁 Estrutura

```
msn-mail/
├── main.js          # Processo principal Electron
├── preload.js       # Ponte segura IPC
├── package.json
└── src/
    ├── index.html   # Janela principal
    ├── style.css    # Visual MSN
    ├── renderer.js  # Lógica da interface
    └── toast.html   # Popup de notificação
```

## 🗺 Roadmap

- [x] Etapa 1 — Interface MSN + dados mock
- [ ] Etapa 2 — Integração Gmail API (OAuth2)
- [ ] Etapa 3 — Integração Outlook/IMAP
- [ ] Etapa 4 — Sistema de notificação em tempo real
- [ ] Etapa 5 — Filtros avançados e organização

## 🛠 Tecnologias

- [Electron](https://electronjs.org)
- HTML + CSS + JavaScript puro
- Gmail API (em breve)
- Node IMAP (em breve)

---

Feito por [Fernando Brígida](https://fehnox.github.io)
