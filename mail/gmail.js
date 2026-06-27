// mail/gmail.js — Integração Gmail API com OAuth2
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

// Caminhos dos arquivos
const CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials.json');
const TOKEN_PATH        = path.join(__dirname, '..', 'token.json');

// Escopos necessários (somente leitura)
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// ── CARREGAR CREDENCIAIS ──
function loadCredentials() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error('credentials.json não encontrado! Coloque o arquivo na pasta msn-mail/');
  }
  const raw = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  return parsed.installed || parsed.web;
}

// ── CRIAR CLIENT OAUTH2 ──
function createOAuthClient() {
  const creds = loadCredentials();
  return new google.auth.OAuth2(
    creds.client_id,
    creds.client_secret,
    'http://localhost:3000/oauth2callback'
  );
}

// ── AUTENTICAR (abre navegador + captura token) ──
async function authenticate() {
  const oAuth2Client = createOAuthClient();

  // Se já tem token salvo, usa ele
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    oAuth2Client.setCredentials(token);

    // Renova se expirado
    if (token.expiry_date && token.expiry_date < Date.now()) {
      const { credentials } = await oAuth2Client.refreshAccessToken();
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials));
      oAuth2Client.setCredentials(credentials);
    }

    return oAuth2Client;
  }

  // Gera URL de autorização
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  // Abre no navegador
  const { shell } = require('electron');
  shell.openExternal(authUrl);

  // Captura o código via servidor local temporário
  const code = await waitForAuthCode();
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);

  // Salva token para próximas vezes
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  console.log('✅ Token Gmail salvo!');

  return oAuth2Client;
}

// ── SERVIDOR LOCAL PARA CAPTURAR O CÓDIGO OAUTH ──
function waitForAuthCode() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const qs = url.parse(req.url, true).query;

      if (qs.code) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <html><body style="font-family:sans-serif;text-align:center;padding:3rem;background:#0d2137;color:white">
            <h2>✅ MSN Mail autenticado!</h2>
            <p>Pode fechar esta janela e voltar ao app.</p>
          </body></html>
        `);
        server.close();
        resolve(qs.code);
      } else {
        res.writeHead(400);
        res.end('Erro na autenticação');
        server.close();
        reject(new Error('Código OAuth não recebido'));
      }
    });

    server.listen(3000, () => {
      console.log('⏳ Aguardando autenticação no navegador...');
    });

    server.on('error', reject);

    // Timeout de 5 minutos
    setTimeout(() => {
      server.close();
      reject(new Error('Timeout: autenticação não completada em 5 minutos'));
    }, 5 * 60 * 1000);
  });
}

// ── BUSCAR EMAILS ──
async function fetchEmails(auth, { maxResults = 20, query = 'is:inbox' } = {}) {
  const gmail = google.gmail({ version: 'v1', auth });

  try {
    // Lista os IDs dos emails
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: query,
    });

    const messages = listRes.data.messages || [];
    if (messages.length === 0) return [];

    // Busca detalhes de cada email em paralelo
    const emails = await Promise.all(
      messages.map(msg => fetchEmailDetail(gmail, msg.id))
    );

    return emails.filter(Boolean);

  } catch (err) {
    console.error('Erro ao buscar emails:', err.message);
    throw err;
  }
}

// ── DETALHES DE UM EMAIL ──
async function fetchEmailDetail(gmail, messageId) {
  try {
    const res = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    const msg     = res.data;
    const headers = msg.payload.headers;

    const getHeader = (name) =>
      headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const fromRaw  = getHeader('From');
    const fromName = fromRaw.replace(/<.*>/, '').trim().replace(/"/g, '') || fromRaw;
    const fromEmail = (fromRaw.match(/<(.+)>/) || [])[1] || fromRaw;

    const subject = getHeader('Subject') || '(sem assunto)';
    const date    = getHeader('Date');
    const isUnread = msg.labelIds?.includes('UNREAD') || false;

    // Extrai corpo do email
    const body = extractBody(msg.payload);

    // Preview: primeiros 120 caracteres do corpo
    const preview = body.replace(/\n+/g, ' ').trim().slice(0, 120) + '...';

    // Formata data
    const dateObj  = new Date(date);
    const now      = new Date();
    const isToday  = dateObj.toDateString() === now.toDateString();
    const timeStr  = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dateStr  = isToday ? 'Hoje' : dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    return {
      id:      messageId,
      from:    fromName,
      email:   fromEmail,
      subject,
      preview,
      body,
      account: 'gmail',
      time:    timeStr,
      date:    dateStr,
      unread:  isUnread,
      raw:     date,
    };

  } catch (err) {
    console.error(`Erro ao buscar email ${messageId}:`, err.message);
    return null;
  }
}

// ── EXTRAIR CORPO DO EMAIL ──
function extractBody(payload) {
  // Email simples
  if (payload.body?.data) {
    return decodeBase64(payload.body.data);
  }

  // Email com partes (multipart)
  if (payload.parts) {
    // Prefere text/plain
    const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      return decodeBase64(textPart.body.data);
    }

    // Fallback: text/html sem tags
    const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
    if (htmlPart?.body?.data) {
      const html = decodeBase64(htmlPart.body.data);
      return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    }

    // Recursivo para multipart aninhado
    for (const part of payload.parts) {
      if (part.parts) {
        const nested = extractBody(part);
        if (nested) return nested;
      }
    }
  }

  return '(conteúdo não disponível)';
}

// ── DECODIFICAR BASE64 ──
function decodeBase64(data) {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

// ── MARCAR EMAIL COMO LIDO ──
async function markAsRead(auth, messageId) {
  const gmail = google.gmail({ version: 'v1', auth });
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: { removeLabelIds: ['UNREAD'] },
  });
}

module.exports = { authenticate, fetchEmails, markAsRead };
