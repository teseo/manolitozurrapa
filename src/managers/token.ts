import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';
import type { TokenData, TokenValidationResult, TokenRefreshEvent } from '../types/index.js';
import { INTERVALS, RETRY_CONFIG, API_URLS } from '../config/constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKENS_PATH = path.join(__dirname, '../../data/tokens.json');
const ENV_PATH = path.join(__dirname, '../../.env');

interface TokenManagerConfig {
  clientId: string;
  clientSecret: string;
}

export interface TokenManagerEvents {
  tokenRefreshed: (event: TokenRefreshEvent) => void;
  authRequired: () => void;
  refreshFailed: (error: Error) => void;
  tokenDead: () => void;
}

export class TokenManager extends EventEmitter {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt: Date | null = null;
  private validateInterval: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private config: TokenManagerConfig;

  constructor(config: TokenManagerConfig) {
    super();
    this.config = config;
  }

  /**
   * Obtiene el access token actual
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Carga tokens desde archivo o variables de entorno
   */
  load(): boolean {
    // Intentar cargar desde tokens.json primero
    if (fs.existsSync(TOKENS_PATH)) {
      try {
        const data: TokenData = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
        this.accessToken = data.accessToken;
        this.refreshToken = data.refreshToken;
        this.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
        console.log('🔑 Tokens cargados desde tokens.json');
        return true;
      } catch (err) {
        console.error('⚠️ Error leyendo tokens.json, usando .env:', (err as Error).message);
      }
    }

    // Fallback a .env
    this.accessToken = process.env.TWITCH_ACCESS_TOKEN || null;
    this.refreshToken = process.env.TWITCH_REFRESH_TOKEN || null;
    this.expiresAt = null;

    if (this.accessToken && this.refreshToken) {
      console.log('🔑 Tokens cargados desde .env');
      this.save();
      return true;
    }

    console.error('❌ No se encontraron tokens. Ejecuta: npm run auth');
    return false;
  }

  /**
   * Guarda tokens a archivo y .env
   */
  save(): void {
    const dataDir = path.dirname(TOKENS_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const data: TokenData = {
      accessToken: this.accessToken || '',
      refreshToken: this.refreshToken || '',
      expiresAt: this.expiresAt?.toISOString() || null,
      lastUpdated: new Date().toISOString(),
    };

    fs.writeFileSync(TOKENS_PATH, JSON.stringify(data, null, 2));
    // Secure file permissions (owner read/write only)
    fs.chmodSync(TOKENS_PATH, 0o600);
    this.updateEnv();
    console.log('💾 Tokens guardados');
  }

  /**
   * Actualiza el archivo .env
   */
  private updateEnv(): void {
    if (!fs.existsSync(ENV_PATH)) return;

    let content = fs.readFileSync(ENV_PATH, 'utf-8');

    const updateOrAdd = (content: string, key: string, value: string): string => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(content)) {
        return content.replace(regex, `${key}=${value}`);
      }
      return content + (content.endsWith('\n') ? '' : '\n') + `${key}=${value}\n`;
    };

    content = updateOrAdd(content, 'TWITCH_ACCESS_TOKEN', this.accessToken || '');
    content = updateOrAdd(content, 'TWITCH_REFRESH_TOKEN', this.refreshToken || '');

    fs.writeFileSync(ENV_PATH, content);
    // Secure file permissions (owner read/write only)
    fs.chmodSync(ENV_PATH, 0o600);
  }

  /**
   * Valida el token con Twitch
   */
  async validate(): Promise<TokenValidationResult> {
    if (!this.accessToken) {
      return { valid: false, reason: 'No hay access token' };
    }

    try {
      const response = await fetch(API_URLS.twitchValidate, {
        headers: { Authorization: `OAuth ${this.accessToken}` },
      });

      if (response.ok) {
        const data = await response.json() as { expires_in: number; login: string };

        if (data.expires_in) {
          this.expiresAt = new Date(Date.now() + data.expires_in * 1000);
        }

        console.log(`✅ Token válido. Expira en ${Math.round(data.expires_in / 60)} minutos. User: ${data.login}`);

        // Refrescar proactivamente si expira pronto
        if (data.expires_in * 1000 < INTERVALS.tokenRefreshBefore) {
          console.log('⏰ Token expira pronto, refrescando proactivamente...');
          await this.refresh();
        }

        return { valid: true, expiresIn: data.expires_in, login: data.login };
      } else if (response.status === 401) {
        console.log('⚠️ Token inválido, intentando refrescar...');
        return { valid: false, reason: 'Token expirado o revocado' };
      } else {
        const error = await response.text();
        return { valid: false, reason: `Error ${response.status}: ${error}` };
      }
    } catch (err) {
      return { valid: false, reason: `Error de red: ${(err as Error).message}` };
    }
  }

  /**
   * Refresca el token
   */
  async refresh(retryCount = 0): Promise<boolean> {
    if (this.isRefreshing) {
      console.log('🔄 Refresh ya en progreso, esperando...');
      return new Promise((resolve) => {
        this.once('tokenRefreshed', () => resolve(true));
      });
    }

    this.isRefreshing = true;
    console.log(`🔄 Refrescando token... (intento ${retryCount + 1}/${RETRY_CONFIG.maxRetries})`);

    try {
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken || '',
      });

      const response = await fetch(API_URLS.twitchToken, {
        method: 'POST',
        body: params,
      });

      if (response.ok) {
        const data = await response.json() as {
          access_token: string;
          refresh_token: string;
          expires_in: number;
        };

        const oldToken = this.accessToken || '';
        this.accessToken = data.access_token;
        this.refreshToken = data.refresh_token;
        this.expiresAt = new Date(Date.now() + data.expires_in * 1000);

        this.save();

        console.log(`✅ Token refrescado. Expira en ${Math.round(data.expires_in / 3600)} horas`);

        this.isRefreshing = false;
        this.emit('tokenRefreshed', { oldToken, newToken: this.accessToken });

        return true;
      } else if (response.status === 401) {
        console.error('❌ CRÍTICO: Refresh token expirado. Requiere re-autenticación manual.');
        this.isRefreshing = false;
        this.emit('authRequired');
        return false;
      } else {
        const error = await response.text();
        throw new Error(`Error ${response.status}: ${error}`);
      }
    } catch (err) {
      console.error('❌ Error refrescando token:', (err as Error).message);

      if (retryCount < RETRY_CONFIG.maxRetries - 1) {
        console.log(`⏳ Reintentando en ${RETRY_CONFIG.retryDelayMs / 1000}s...`);
        await new Promise(r => setTimeout(r, RETRY_CONFIG.retryDelayMs));
        this.isRefreshing = false;
        return this.refresh(retryCount + 1);
      }

      this.isRefreshing = false;
      this.emit('refreshFailed', err as Error);
      return false;
    }
  }

  /**
   * Inicia la validación automática periódica
   */
  startAutoValidation(): void {
    if (this.validateInterval) {
      clearInterval(this.validateInterval);
    }

    // Validar inmediatamente
    this.validate().then(result => {
      if (!result.valid) {
        this.refresh();
      }
    });

    // Validar periódicamente
    this.validateInterval = setInterval(async () => {
      console.log('⏰ Validación periódica de token...');
      const result = await this.validate();
      if (!result.valid) {
        const refreshed = await this.refresh();
        if (!refreshed) {
          this.emit('tokenDead');
        }
      }
    }, INTERVALS.tokenValidation);

    console.log(`🔄 Auto-validación iniciada (cada ${INTERVALS.tokenValidation / 60000} min)`);
  }

  /**
   * Detiene la validación automática
   */
  stopAutoValidation(): void {
    if (this.validateInterval) {
      clearInterval(this.validateInterval);
      this.validateInterval = null;
      console.log('🛑 Auto-validación detenida');
    }
  }

  /**
   * Helper para hacer requests a la API de Twitch con retry automático
   */
  async twitchRequest(url: string, options: RequestInit = {}, retry = true): Promise<Response> {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Client-Id': this.config.clientId,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 401 && retry) {
      console.log('🔄 401 recibido, refrescando token...');
      const refreshed = await this.refresh();
      if (refreshed) {
        return this.twitchRequest(url, options, false);
      }
    }

    return response;
  }
}

// Singleton por defecto
let defaultInstance: TokenManager | null = null;

export function getTokenManager(): TokenManager {
  if (!defaultInstance) {
    defaultInstance = new TokenManager({
      clientId: process.env.TWITCH_CLIENT_ID || '',
      clientSecret: process.env.TWITCH_CLIENT_SECRET || '',
    });
  }
  return defaultInstance;
}

export default getTokenManager;
