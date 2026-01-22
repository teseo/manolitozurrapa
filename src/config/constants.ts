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
