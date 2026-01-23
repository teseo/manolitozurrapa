import type { TwitchConfig } from '../types/index.js';

// Configuración por defecto del bot
export const DEFAULT_CONFIG: TwitchConfig = {
  clientId: process.env.TWITCH_CLIENT_ID || '',
  clientSecret: process.env.TWITCH_CLIENT_SECRET || '',
  channel: process.env.TWITCH_CHANNEL || 'teseo',
  botUsername: process.env.TWITCH_BOT_USERNAME || 'manolitozurrapa',
  defaultDuration: 90,
  minDuration: 15,
  maxDuration: 90,
  cooldownMs: 30000,
};

// Intervalos de tiempo
export const INTERVALS = {
  tokenValidation: 30 * 60 * 1000,      // 30 minutos
  tokenRefreshBefore: 60 * 60 * 1000,   // 1 hora antes de expirar
  piropoTimer: 15 * 60 * 1000,          // 15 minutos
  memoryCleanup: 30 * 60 * 1000,        // 30 minutos
  searchCooldown: 5000,                  // 5 segundos
  manolitoCooldown: 3000,                // 3 segundos
  summaryInterval: 30 * 60 * 1000,      // 30 minutos para mini-resúmenes
} as const;

// Límites por tier
export const TIER_LIMITS = {
  messages: {
    reina: Infinity,
    broadcaster: Infinity,
    mod: Infinity,
    vip: Infinity,
    T3: Infinity,
    T2: 60,
    T1: 30,
    none: 0,
  },
  searches: {
    reina: 150,
    broadcaster: Infinity,
    mod: 150,
    vip: 150,
    T3: 150,
    T2: 10,
    T1: 0,
    none: 0,
  },
} as const;

// Configuración de retry
export const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 5000,
} as const;

// Límites de caracteres
export const CHAR_LIMITS = {
  response: 400,
  maxResponse: 450,
  topic: 50,
} as const;

// URLs de APIs
export const API_URLS = {
  twitchToken: 'https://id.twitch.tv/oauth2/token',
  twitchValidate: 'https://id.twitch.tv/oauth2/validate',
  twitchHelix: 'https://api.twitch.tv/helix',
  twitchUsers: 'https://api.twitch.tv/helix/users',
  twitchClips: 'https://api.twitch.tv/helix/clips',
  braveSearch: 'https://api.search.brave.com/res/v1/web/search',
} as const;

// Configuración de proveedores de IA (compatibles con OpenAI SDK)
export const AI_PROVIDERS = {
  deepseek: { baseURL: 'https://api.deepseek.com', defaultModel: 'deepseek-chat' },
  groq: { baseURL: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b-versatile' },
  openai: { baseURL: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini' },
  openrouter: { baseURL: 'https://openrouter.ai/api/v1', defaultModel: 'meta-llama/llama-3.3-70b-instruct' },
} as const;

// Configuración por defecto de IA
export const AI_DEFAULTS = {
  provider: 'deepseek',
  maxTokens: 200,
  temperature: 1.3,  // DeepSeek recomienda 1.3 conversación, 1.5 creativo
} as const;
