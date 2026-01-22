import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '../.env');
const TOKENS_PATH = path.join(__dirname, '../data/tokens.json');

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/callback';
const SCOPES =
  'clips:edit chat:read chat:edit channel:read:subscriptions channel:read:vips moderation:read';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: TWITCH_CLIENT_ID y TWITCH_CLIENT_SECRET deben estar en .env');
  process.exit(1);
}

const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPES)}`;

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    client_id: CLIENT_ID!,
    client_secret: CLIENT_SECRET!,
    code: code,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI,
  });

  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    body: params,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error al obtener tokens: ${error}`);
  }

  return response.json() as Promise<TokenResponse>;
}

function updateEnvFile(accessToken: string, refreshToken: string): void {
  let envContent = '';

  if (fs.existsSync(ENV_PATH)) {
    envContent = fs.readFileSync(ENV_PATH, 'utf-8');
  }

  const updateOrAdd = (content: string, key: string, value: string): string => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      return content.replace(regex, `${key}=${value}`);
    }
    return content + (content.endsWith('\n') ? '' : '\n') + `${key}=${value}\n`;
  };

  envContent = updateOrAdd(envContent, 'TWITCH_ACCESS_TOKEN', accessToken);
  envContent = updateOrAdd(envContent, 'TWITCH_REFRESH_TOKEN', refreshToken);

  fs.writeFileSync(ENV_PATH, envContent);
}

function saveTokensFile(accessToken: string, refreshToken: string, expiresIn: number): void {
  const dataDir = path.dirname(TOKENS_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const data = {
    accessToken,
    refreshToken,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    lastUpdated: new Date().toISOString(),
  };

  fs.writeFileSync(TOKENS_PATH, JSON.stringify(data, null, 2));
}

function openBrowser(url: string): void {
  const command =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${command} "${url}"`);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h1>Error de autorización</h1><p>${error}</p>`);
      server.close();
      return;
    }

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>Error</h1><p>No se recibió código de autorización</p>');
      return;
    }

    try {
      const tokens = await exchangeCodeForTokens(code);
      updateEnvFile(tokens.access_token, tokens.refresh_token);
      saveTokensFile(tokens.access_token, tokens.refresh_token, tokens.expires_in);

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <html>
          <body style="font-family: system-ui; text-align: center; padding: 50px;">
            <h1 style="color: #9146FF;">✓ Autorización exitosa</h1>
            <p>Los tokens se han guardado en .env y data/tokens.json</p>
            <p>Puedes cerrar esta ventana.</p>
          </body>
        </html>
      `);

      console.log('\n✓ Tokens obtenidos y guardados');
      console.log('  - Access Token: ' + tokens.access_token.substring(0, 10) + '...');
      console.log('  - Refresh Token: ' + tokens.refresh_token.substring(0, 10) + '...');

      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 1000);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h1>Error</h1><p>${(err as Error).message}</p>`);
      console.error('Error:', (err as Error).message);
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(3000, () => {
  console.log('Servidor de autenticación en http://localhost:3000');
  console.log('Abriendo navegador para autorización...\n');
  openBrowser(authUrl);
});
