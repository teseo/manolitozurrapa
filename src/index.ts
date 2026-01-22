import './env.js';

import tmi, { type ChatUserstate } from 'tmi.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TokenManager } from './managers/token.js';
import { MemoryManager } from './managers/memory.js';
import { StreamSummaryManager } from './managers/stream-summary.js';
import { AIService } from './services/ai.js';
import { SearchService } from './services/search.js';
import { DiscordService } from './services/discord.js';
import { TwitchService } from './services/twitch.js';
import { log, logSearch, getTimestamp } from './utils/logger.js';
import { detectLanguage, parseClipCommand, getTierNumber, sleep } from './utils/helpers.js';
import { DEFAULT_CONFIG, INTERVALS, TIER_LIMITS, CHAR_LIMITS } from './config/constants.js';
import type { TierInfo, TierName, UsageData, SupportedLanguage } from './types/index.js';

// Cargar configuración de comunidad (si existe)
let COMMUNITY: import('./types/index.js').Community;
let EMOTES: import('./types/index.js').Emotes;
let VIP_USERS: string[] = [];
let WATCHED_USERS: string[] = [];

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  const communityModule = await import('./config/community.js');
  COMMUNITY = communityModule.COMMUNITY;
  EMOTES = communityModule.EMOTES;
  VIP_USERS = communityModule.VIP_USERS || [];
  WATCHED_USERS = communityModule.WATCHED_USERS || [];
} catch {
  console.warn('⚠️ No se encontró config/community.ts, usando valores por defecto');
  COMMUNITY = { reina: [], mods: [], vips: [], subs: [], gifters: {}, bots: [] };
  EMOTES = { happy: [], love: [], clap: [], sad: [], funny: [], rock: [] };
}

// ===========================================
// INICIALIZACIÓN
// ===========================================

const CONFIG = { ...DEFAULT_CONFIG };

// Managers y servicios
const tokenManager = new TokenManager({
  clientId: CONFIG.clientId,
  clientSecret: CONFIG.clientSecret,
});

const memoryManager = new MemoryManager(COMMUNITY, EMOTES);

const aiService = new AIService(
  { apiKey: process.env.GROQ_API_KEY || '' },
  memoryManager
);

const searchService = new SearchService({
  apiKey: process.env.BRAVE_API_KEY || '',
});

const discordService = new DiscordService({
  webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
});
discordService.setMemoryManager(memoryManager);

const twitchService = new TwitchService(tokenManager);

const streamSummaryManager = new StreamSummaryManager({
  groqApiKey: process.env.GROQ_API_KEY || '',
});

// ===========================================
// ESTADO GLOBAL
// ===========================================

const userLanguages: Record<string, SupportedLanguage> = {};
const searchCooldowns: Record<string, number> = {}; // timestamp cuando alcanzó el límite
const SEARCH_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutos

let lastClipTime = 0;
let lastManolitoGlobal = 0;
let lastSearchGlobal = 0;

// Reinas
let mariajoLastSeen = 0;
let glorimar97LastSeen = 0;
let piropoInterval: NodeJS.Timeout | null = null;
let lastPiropoTarget: string | null = null;

// ===========================================
// USAGE PERSISTENCE
// ===========================================

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sessionTimestamp = new Date();
const usageFileName = `usage_${sessionTimestamp.toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;
const usageFilePath = path.join(dataDir, usageFileName);

const usageData: UsageData = {
  startedAt: sessionTimestamp.toISOString().slice(0, 19),
  users: {},
};

function saveUsageData(): void {
  fs.writeFileSync(usageFilePath, JSON.stringify(usageData, null, 2));
}

console.log(`Nueva sesión: ${usageFileName}`);

// ===========================================
// HELPER FUNCTIONS
// ===========================================

function getUserLang(username: string): SupportedLanguage {
  return userLanguages[username] || 'es';
}

function setUserLang(username: string, lang: SupportedLanguage): void {
  userLanguages[username] = lang;
}

function msg(key: string, username: string, replacements: Record<string, string | number> = {}): string {
  return aiService.getMessage(key, getUserLang(username), replacements);
}

function getUsedMessages(username: string): number {
  return usageData.users[username]?.used || 0;
}

function getUsedSearches(username: string): number {
  // Si el usuario tiene cooldown y ya pasaron 10 min, resetear contador
  if (searchCooldowns[username]) {
    const elapsed = Date.now() - searchCooldowns[username];
    if (elapsed >= SEARCH_COOLDOWN_MS) {
      // Resetear contador y quitar cooldown
      if (usageData.users[username]) {
        usageData.users[username].searches = 0;
        saveUsageData();
      }
      delete searchCooldowns[username];
      console.log(`🔄 Cooldown expirado para ${username}, búsquedas reseteadas`);
    }
  }
  return usageData.users[username]?.searches || 0;
}

function isInSearchCooldown(username: string): { inCooldown: boolean; remainingMin: number } {
  if (!searchCooldowns[username]) {
    return { inCooldown: false, remainingMin: 0 };
  }
  const elapsed = Date.now() - searchCooldowns[username];
  if (elapsed >= SEARCH_COOLDOWN_MS) {
    delete searchCooldowns[username];
    return { inCooldown: false, remainingMin: 0 };
  }
  const remainingMs = SEARCH_COOLDOWN_MS - elapsed;
  return { inCooldown: true, remainingMin: Math.ceil(remainingMs / 60000) };
}

function setSearchCooldown(username: string): void {
  searchCooldowns[username] = Date.now();
  console.log(`⏰ Cooldown de búsqueda activado para ${username} (10 min)`);
}

function incrementUsage(username: string, tierNum: number, limit: number): number {
  const timestamp = getTimestamp();
  if (!usageData.users[username]) {
    usageData.users[username] = { tier: tierNum, used: 0, limit: limit, timestamps: [] };
  }
  usageData.users[username].used++;
  usageData.users[username].tier = tierNum;
  usageData.users[username].limit = limit;
  if (!usageData.users[username].timestamps) {
    usageData.users[username].timestamps = [];
  }
  usageData.users[username].timestamps.push(timestamp);
  saveUsageData();

  checkUsageSpeedAlert(username, limit);

  return usageData.users[username].used;
}

function incrementSearchUsage(username: string): number {
  if (!usageData.users[username]) {
    usageData.users[username] = { tier: 0, used: 0, limit: 0, timestamps: [], searches: 0 };
  }
  if (!usageData.users[username].searches) {
    usageData.users[username].searches = 0;
  }
  usageData.users[username].searches!++;
  saveUsageData();
  return usageData.users[username].searches!;
}

// ===========================================
// TIER SYSTEM
// ===========================================

function getUserTier(userstate: ChatUserstate): TierInfo {
  const username = userstate.username?.toLowerCase() || '';

  if (userstate.badges?.broadcaster === '1') return { tier: 'broadcaster', limit: TIER_LIMITS.messages.broadcaster };

  if (VIP_USERS.includes(username)) {
    return { tier: 'reina', limit: TIER_LIMITS.messages.reina };
  }
  if (userstate.mod === true) return { tier: 'mod', limit: TIER_LIMITS.messages.mod };
  if (userstate.badges?.vip === '1') return { tier: 'vip', limit: TIER_LIMITS.messages.vip };
  if (userstate.badges?.subscriber) {
    const subTier = userstate.badges.subscriber;
    if (subTier === '3000') return { tier: 'T3', limit: TIER_LIMITS.messages.T3 };
    if (subTier === '2000') return { tier: 'T2', limit: TIER_LIMITS.messages.T2 };
    return { tier: 'T1', limit: TIER_LIMITS.messages.T1 };
  }
  return { tier: 'none', limit: TIER_LIMITS.messages.none };
}

function getSearchTier(userstate: ChatUserstate): TierInfo {
  const username = userstate.username?.toLowerCase() || '';

  if (userstate.badges?.broadcaster === '1') return { tier: 'broadcaster', limit: TIER_LIMITS.searches.broadcaster };

  if (VIP_USERS.includes(username)) {
    return { tier: 'reina', limit: TIER_LIMITS.searches.reina };
  }
  if (userstate.mod === true) return { tier: 'mod', limit: TIER_LIMITS.searches.mod };
  if (userstate.badges?.vip === '1') return { tier: 'vip', limit: TIER_LIMITS.searches.vip };
  if (userstate.badges?.subscriber) {
    const subTier = userstate.badges.subscriber;
    if (subTier === '3000') return { tier: 'T3', limit: TIER_LIMITS.searches.T3 };
    if (subTier === '2000') return { tier: 'T2', limit: TIER_LIMITS.searches.T2 };
    return { tier: 'T1', limit: TIER_LIMITS.searches.T1 };
  }
  return { tier: 'none', limit: TIER_LIMITS.searches.none };
}

// ===========================================
// ALERTAS
// ===========================================

let alertClient: tmi.Client | null = null;
let alertChannel: string | null = null;

function setAlertClient(tmiClient: tmi.Client, channel: string): void {
  alertClient = tmiClient;
  alertChannel = channel;
}

function checkUsageSpeedAlert(username: string, limit: number): void {
  const userData = usageData.users[username];
  if (!userData || limit === Infinity) return;

  const timestamps = userData.timestamps || [];
  const used = userData.used;
  const halfLimit = Math.floor(limit / 2);

  if (used >= halfLimit && timestamps.length >= halfLimit) {
    const firstTs = timestamps[0];
    const lastTs = timestamps[timestamps.length - 1];

    const toMinutes = (ts: string): number => {
      const [h, m, s] = ts.split(':').map(Number);
      return h * 60 + m + s / 60;
    };

    const diffMin = toMinutes(lastTs) - toMinutes(firstTs);

    if (diffMin < 30 && used === halfLimit) {
      const time = getTimestamp();

      if (WATCHED_USERS.includes(username)) {
        console.log(`[${time}] 🚨 ALERTA: ${username} ha gastado ${used}/${limit} mensajes en ${Math.round(diffMin)} min`);
      }

      if (alertClient && alertChannel) {
        alertClient.say(alertChannel, `@${username} ${msg('alerta_uso_rapido', username, { used, limit, minutes: Math.round(diffMin) })}`);
      }
    }
  }
}

// ===========================================
// PIROPOS TIMER
// ===========================================

function startPiropoTimer(tmiClient: tmi.Client, channel: string): void {
  if (piropoInterval) return;

  piropoInterval = setInterval(() => {
    const now = Date.now();
    const thirtyMin = 30 * 60 * 1000;

    const mariajoActive = now - mariajoLastSeen <= thirtyMin;
    const glorimar97Active = now - glorimar97LastSeen <= thirtyMin;

    if (!mariajoActive && !glorimar97Active) {
      return;
    }

    let target: string;
    if (mariajoActive && glorimar97Active) {
      target = lastPiropoTarget === 'mariajosobrasada' ? 'glorimar97' : 'mariajosobrasada';
    } else if (mariajoActive) {
      target = 'mariajosobrasada';
    } else {
      target = 'glorimar97';
    }
    lastPiropoTarget = target;

    const targetLang = getUserLang(target);
    const piropo = aiService.getRandomPiropo(targetLang);
    const mensaje = `@${target} ${piropo}`;
    tmiClient.say(channel, mensaje);
    console.log(`[PIROPO] ${mensaje}`);
  }, INTERVALS.piropoTimer);
}

// ===========================================
// PERMISSIONS
// ===========================================

function hasPermission(userstate: ChatUserstate): boolean {
  return (
    userstate.badges?.broadcaster === '1' ||
    userstate.mod === true ||
    userstate.badges?.vip === '1'
  );
}

function isOnCooldown(): number | false {
  const now = Date.now();
  if (now - lastClipTime < CONFIG.cooldownMs) {
    const remaining = Math.ceil((CONFIG.cooldownMs - (now - lastClipTime)) / 1000);
    return remaining;
  }
  return false;
}

// ===========================================
// BÚSQUEDA HANDLER
// ===========================================

async function handleSearch(
  client: tmi.Client,
  channel: string,
  userstate: ChatUserstate,
  query: string,
  cmdLog: string
): Promise<void> {
  const username = userstate.username?.toLowerCase() || '';
  const { tier, limit } = getSearchTier(userstate);
  const usedSearches = getUsedSearches(username);
  const logOpts = { tier: tier as TierName, used: usedSearches, limit };

  if (!searchService.hasApiKey()) {
    log(userstate.username || '', cmdLog, 'NO_API_KEY', { ...logOpts, action: 'system' });
    client.say(channel, `@${userstate.username} ${msg('busca_no_api', username)}`);
    return;
  }

  if (limit === 0) {
    log(userstate.username || '', cmdLog, 'NO_TIER', { ...logOpts, action: 'system' });
    client.say(channel, `@${userstate.username} ${msg('busca_no_tier', username)}`);
    return;
  }

  // Check if user is in search cooldown
  const cooldownStatus = isInSearchCooldown(username);
  if (cooldownStatus.inCooldown) {
    log(userstate.username || '', cmdLog, 'SEARCH_COOLDOWN', { ...logOpts, action: 'system' });
    client.say(channel, `@${userstate.username} ${msg('busca_en_cooldown', username, { minutes: cooldownStatus.remainingMin })}`);
    return;
  }

  if (limit !== Infinity && usedSearches >= limit) {
    // Activar cooldown de 10 minutos
    setSearchCooldown(username);
    log(userstate.username || '', cmdLog, 'LIMIT_REACHED', { ...logOpts, action: 'system' });
    client.say(channel, `@${userstate.username} ${msg('busca_limite', username, { limit })}`);
    return;
  }

  const now = Date.now();
  if (now - lastSearchGlobal < INTERVALS.searchCooldown) {
    log(userstate.username || '', cmdLog, 'COOLDOWN', { ...logOpts, action: 'system' });
    client.say(channel, `@${userstate.username} ${msg('busca_cooldown', username)}`);
    return;
  }

  if (!query) {
    log(userstate.username || '', cmdLog, 'NO_QUERY', { ...logOpts, action: 'system' });
    client.say(channel, `@${userstate.username} ${msg('busca_sin_query', username)}`);
    return;
  }

  lastSearchGlobal = now;

  if (limit !== Infinity) {
    incrementSearchUsage(username);
  }

  // Track search for summary
  streamSummaryManager.trackSearch(username, query);

  try {
    const startTotal = Date.now();
    const startBrave = Date.now();
    const results = await searchService.search(query);
    const endBrave = Date.now();
    const timeBrave = endBrave - startBrave;

    if (!results || results.length === 0) {
      log(userstate.username || '', cmdLog, 'NO_RESULTS', { ...logOpts, action: 'system' });
      client.say(channel, `@${userstate.username} ${msg('busca_sin_resultados', username)}`);
      return;
    }

    const timings: { groq?: number } = {};
    const userLang = getUserLang(username);
    const { response, debug } = await aiService.askWithSearch(query, results, username, timings, userLang);
    const finalResponse = response.slice(0, CHAR_LIMITS.response);
    const endTotal = Date.now();
    const timeTotal = endTotal - startTotal;

    logSearch(query, results, debug.userPrompt, response, {
      brave: timeBrave,
      groq: timings.groq || 0,
      total: timeTotal,
    });

    log(userstate.username || '', cmdLog, finalResponse, {
      ...logOpts,
      action: 'llm+search',
      searchQuery: query,
      braveResults: debug.braveResults,
      groqPrompt: debug.userPrompt,
    });
    client.say(channel, `@${userstate.username} ${finalResponse}`);
  } catch (error) {
    console.error('Error Busca:', (error as Error).message);
    log(userstate.username || '', cmdLog, `ERROR: ${(error as Error).message}`, { ...logOpts, action: 'system' });
    client.say(channel, `@${userstate.username} ${msg('busca_error', username)}`);
  }
}

// ===========================================
// BOT SETUP
// ===========================================

if (!tokenManager.load()) {
  console.error('❌ No se pudieron cargar los tokens. Ejecuta: npm run auth');
  process.exit(1);
}

let client = new tmi.Client({
  options: { debug: false },
  identity: {
    username: CONFIG.botUsername,
    password: `oauth:${tokenManager.getAccessToken()}`,
  },
  channels: [CONFIG.channel],
});

// Event handlers para token refresh
tokenManager.on('tokenRefreshed', async ({ newToken }) => {
  console.log('🔄 Token refrescado, reconectando cliente de chat...');
  try {
    await client.disconnect();
    client = new tmi.Client({
      options: { debug: false },
      identity: {
        username: CONFIG.botUsername,
        password: `oauth:${newToken}`,
      },
      channels: [CONFIG.channel],
    });
    await client.connect();
    console.log('✅ Cliente reconectado con nuevo token');
  } catch (err) {
    console.error('❌ Error reconectando cliente:', (err as Error).message);
  }
});

tokenManager.on('authRequired', async () => {
  console.error('🚨 CRÍTICO: Se requiere re-autenticación manual');
  if (discordService.hasWebhook()) {
    await discordService.sendEmergencyNotification('🚨 CRÍTICO: El bot necesita re-autenticación manual. Ejecuta: npm run auth');
  }
});

tokenManager.on('refreshFailed', async (err: Error) => {
  console.error('🚨 Error refrescando token:', err.message);
  if (discordService.hasWebhook()) {
    await discordService.sendEmergencyNotification(`🚨 Error refrescando token: ${err.message}. El bot puede dejar de funcionar.`);
  }
});

tokenManager.on('tokenDead', async () => {
  console.error('💀 Token completamente muerto');
  if (discordService.hasWebhook()) {
    await discordService.sendEmergencyNotification('💀 El token del bot está muerto. Requiere intervención manual: npm run auth');
  }
});

// ===========================================
// MESSAGE HANDLER
// ===========================================

client.on('message', async (channel: string, userstate: ChatUserstate, message: string, self: boolean) => {
  if (self) return;

  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  const username = (userstate.username || '').toLowerCase();

  // Trackear actividad de las reinas
  if (username === 'mariajosobrasada') {
    mariajoLastSeen = Date.now();
  }
  if (username === 'glorimar97') {
    glorimar97LastSeen = Date.now();
  }

  // --- Comando !mismensajes ---
  if (lower === '!mismensajes') {
    const { tier, limit } = getUserTier(userstate);
    const used = getUsedMessages(username);

    if (limit === Infinity) {
      client.say(channel, `@${userstate.username} ${msg('mismensajes_infinito', username)}`);
    } else if (limit === 0) {
      client.say(channel, `@${userstate.username} ${msg('mismensajes_no_sub', username)}`);
    } else if (tier === 'T2') {
      client.say(channel, `@${userstate.username} ${msg('mismensajes_t2', username, { remaining: limit - used })}`);
    } else {
      client.say(channel, `@${userstate.username} ${msg('mismensajes_t1', username, { remaining: limit - used })}`);
    }
    return;
  }

  // --- Comando !resumen ---
  if (lower === '!resumen') {
    // Solo broadcaster puede pedir el resumen
    if (userstate.badges?.broadcaster !== '1') {
      client.say(channel, `@${userstate.username} ${msg('resumen_no_permiso', username)}`);
      return;
    }

    client.say(channel, `@${userstate.username} ${msg('resumen_generando', username)}`);

    try {
      const userLang = getUserLang(username);
      const summary = await streamSummaryManager.generateFinalSummary(userLang);
      client.say(channel, `📊 ${summary}`);
      log(userstate.username || '', '!resumen', summary, { action: 'system' });
    } catch (error) {
      console.error('Error generando resumen:', (error as Error).message);
      client.say(channel, `@${userstate.username} ${msg('resumen_error', username)}`);
    }
    return;
  }

  // --- Comando !cuentamealgomanolito ---
  if (lower.startsWith('!cuentamealgomanolito')) {
    const now = Date.now();

    if (now - lastManolitoGlobal < INTERVALS.manolitoCooldown) {
      log(userstate.username || '', '!cuentamealgomanolito', 'COOLDOWN', { action: 'system' });
      return;
    }
    lastManolitoGlobal = now;

    const userLang = getUserLang(username);
    const response = aiService.getQuickFact(userLang).slice(0, CHAR_LIMITS.response);
    log(userstate.username || '', '!cuentamealgomanolito', response, { action: 'fact' });
    client.say(channel, `@${userstate.username} ${response}`);
    return;
  }

  // --- Comando !oyemanolito o mención @manolitozurrapa ---
  const mentionMatch = lower.match(/^@manolitozurrapa\s*(.*)/);
  const isOyeManolito = lower.startsWith('!oyemanolito');
  const isMention = mentionMatch !== null;

  // Detectar si es una petición de búsqueda en mención
  let isMentionSearch = false;
  let searchQuery = '';

  if (isMention && mentionMatch[1]) {
    const mentionArgs = mentionMatch[1].trim();
    // Regex más flexible: "busca X", "¿me buscas X?", "puedes buscar X", "podrías buscarme X", "soek vir my X" (AF), etc.
    const searchMatch = mentionArgs.match(/^¿?\s*(?:me\s+|puedes\s+|podr[ií]as\s+|kan\s+jy\s+)?(busca(?:r(?:me)?|me|s)?|búsca(?:me|s)?|search(?:\s+for)?|encuentra|investiga|soek(?:\s+vir\s+my)?)(?:\s+(?:en\s+)?(?:internet|la\s+web|google|op\s+die\s+web))?\s+(.+?)[\?]?$/i);
    if (searchMatch) {
      isMentionSearch = true;
      searchQuery = searchMatch[2].trim();
    }
  }

  // Si es búsqueda por mención
  if (isMentionSearch && searchQuery) {
    // Detectar idioma del mensaje completo antes de buscar
    const mentionArgs = mentionMatch![1].trim();
    const detectedLang = detectLanguage(mentionArgs);
    setUserLang(username, detectedLang);

    const cmdLog = `@manolitozurrapa busca ${searchQuery}`;
    await handleSearch(client, channel, userstate, searchQuery, cmdLog);
    return;
  }

  if (isOyeManolito || isMention) {
    const now = Date.now();
    const args = isMention ? mentionMatch![1].trim() : trimmed.slice(12).trim();
    const cmdName = isMention ? '@manolitozurrapa' : '!oyemanolito';
    const cmdLog = args ? `${cmdName} ${args}` : cmdName;
    const { tier, limit } = getUserTier(userstate);
    const used = getUsedMessages(username);

    // Detectar idioma del mensaje
    if (args) {
      const detectedLang = detectLanguage(args);
      setUserLang(username, detectedLang);
    }

    const logOpts = { tier: tier as TierName, used, limit };

    if (limit === 0) {
      log(userstate.username || '', cmdLog, 'NO_SUB', { ...logOpts, action: 'system' });
      client.say(channel, `@${userstate.username} ${msg('oyemanolito_no_sub', username)}`);
      return;
    }

    if (limit !== Infinity && used >= limit) {
      log(userstate.username || '', cmdLog, 'LIMIT_REACHED', { ...logOpts, action: 'system' });
      client.say(channel, `@${userstate.username} ${msg('oyemanolito_limite', username, { limit })}`);
      return;
    }

    if (now - lastManolitoGlobal < INTERVALS.manolitoCooldown) {
      log(userstate.username || '', cmdLog, 'COOLDOWN', { ...logOpts, action: 'system' });
      client.say(channel, `@${userstate.username} ${msg('oyemanolito_cooldown', username)}`);
      return;
    }

    if (!args) {
      log(userstate.username || '', cmdName, 'NO_ARGS', { ...logOpts, action: 'system' });
      client.say(channel, `@${userstate.username} ${msg('oyemanolito_sin_pregunta', username)}`);
      return;
    }

    lastManolitoGlobal = now;

    let newUsed = used;
    if (limit !== Infinity) {
      newUsed = incrementUsage(username, getTierNumber(tier), limit);
    }
    const newLogOpts = { tier: tier as TierName, used: newUsed, limit };

    try {
      const userLang = getUserLang(username);
      const response = (await aiService.ask(args, username, userLang)).slice(0, CHAR_LIMITS.response);
      log(userstate.username || '', cmdLog, response, { ...newLogOpts, action: 'llm' });
      client.say(channel, `@${userstate.username} ${response}`);
    } catch (error) {
      console.error('Error Manolito:', (error as Error).message);
      log(userstate.username || '', cmdLog, `ERROR: ${(error as Error).message}`, { ...newLogOpts, action: 'system' });
      client.say(channel, `@${userstate.username} ${msg('oyemanolito_error', username)}`);
    }
    return;
  }

  // --- Comando !ayudaclip ---
  if (lower === '!ayudaclip') {
    client.say(channel, `@${userstate.username} Para crear clip escribe !clip. Te preguntare duracion (15, 30, 45, 60, 90 segundos) y titulo. Responde por ejemplo '30 Momento epico' o solo el titulo para 90s.`);
    return;
  }

  // --- Comando !clip ---
  if (!lower.startsWith('!clip')) return;

  const args = trimmed.slice(5).trim().split(/\s+/).filter(Boolean);
  const clipCmd = args.length ? `!clip ${args.join(' ')}` : '!clip';

  if (!hasPermission(userstate)) {
    log(userstate.username || '', clipCmd, 'NO_PERMISSION', { action: 'system' });
    return;
  }

  if (args.length === 0) {
    client.say(channel, `@${userstate.username} Dime duracion en segundos (15, 30, 45, 60, 90) y titulo. Ej: '30 Momento epico' o solo 'Momento epico' para 90s`);
    return;
  }

  const cooldownRemaining = isOnCooldown();
  if (cooldownRemaining) {
    log(userstate.username || '', clipCmd, 'COOLDOWN', { action: 'system' });
    client.say(channel, `@${userstate.username}, espera ${cooldownRemaining}s para crear otro clip.`);
    return;
  }

  const { duration, title } = parseClipCommand(args, CONFIG.defaultDuration, CONFIG.minDuration, CONFIG.maxDuration);

  try {
    const broadcasterId = await twitchService.getBroadcasterId(CONFIG.channel);

    client.say(channel, `Creando clip...`);
    lastClipTime = Date.now();

    const clip = await twitchService.createClip(broadcasterId, duration, title || undefined);
    const clipUrl = twitchService.getClipUrl(clip.id);

    await sleep(3000);

    log(userstate.username || '', clipCmd, clipUrl, { action: 'clip' });
    client.say(channel, `Clip creado: ${clipUrl}`);
    console.log(`Clip creado por ${userstate.username}: ${clipUrl}`);

    // Track clip for summary
    streamSummaryManager.trackClip(userstate.username || 'unknown', clipUrl, title || undefined, duration);

    if (discordService.hasWebhook()) {
      try {
        await sleep(5000);
        await discordService.sendClip({
          url: clipUrl,
          title: title || `Clip de ${CONFIG.channel}`,
          creator: userstate.username || 'unknown',
          duration: duration,
        });
        console.log('📨 Clip enviado a Discord:', clipUrl);
      } catch (discordError) {
        console.error('Error enviando a Discord:', (discordError as Error).message);
      }
    }
  } catch (error) {
    console.error('Error al crear clip:', (error as Error).message);
    log(userstate.username || '', clipCmd, `ERROR: ${(error as Error).message}`, { action: 'system' });
    client.say(channel, `@${userstate.username}, error al crear clip: ${(error as Error).message}`);
    lastClipTime = 0;
  }
});

// ===========================================
// WATCH STREAKS
// ===========================================

client.on('message', (channel: string, tags: ChatUserstate, _message: string, self: boolean) => {
  if (self) return;

  if (tags['msg-id'] === 'viewermilestone' && tags['msg-param-category'] === 'watch-streak') {
    const username = tags['display-name'] || tags.username || '';
    const streak = parseInt(tags['msg-param-value'] || '0', 10);

    console.log(`🔥 Watch Streak: ${username} - ${streak} streams`);
    memoryManager.updateWatchStreak(username, streak);

    const emote = memoryManager.getEmote('love');
    const responses = [
      `¡Ozú ${username}! ${streak} streams seguidos, eso es constancia illo! ${emote}`,
      `¡Aro ${username}! ${streak} directos sin fallar, crack quillo! ${emote}`,
      `${streak} streams! ${username} eso es fidelidad miarma! ${emote}`,
    ];
    client.say(channel, responses[Math.floor(Math.random() * responses.length)]);
  }
});

// ===========================================
// SUSCRIPCIONES
// ===========================================

client.on('subscription', (channel: string, username: string) => {
  const emote = memoryManager.getEmote('happy');
  const responses = [
    `¡Ozú ${username}! Bienvenido a la familia illo! ${emote}`,
    `¡Aro ${username}! Ya eres de los nuestros quillo! ${emote}`,
    `${username} se ha suscrito! Eso está buscao miarma! ${emote}`,
  ];
  client.say(channel, responses[Math.floor(Math.random() * responses.length)]);

  // Track sub for summary
  streamSummaryManager.trackSub(username);
});

client.on('resub', (channel: string, username: string, months: number) => {
  const emote = memoryManager.getEmote('love');
  client.say(channel, `¡${username} lleva ${months} meses con nosotros! Eso es fidelidad illo! ${emote}`);

  // Track resub for summary
  streamSummaryManager.trackResub(username, months);
});

// ===========================================
// SUBS REGALADOS
// ===========================================

client.on('subgift', (channel: string, username: string, _streakMonths: number, recipient: string) => {
  const gifts = memoryManager.getGifterInfo(username);
  const emote = memoryManager.getEmote('love');

  if (username.toLowerCase() === 'mariajosobrasada') {
    client.say(channel, `¡La reina ${username} regala sub a ${recipient}! 👸 Esa es mi Mariajo! ${emote}`);
  } else if (gifts > 0) {
    client.say(channel, `¡${username} (${gifts} gifts) regala sub a ${recipient}! Qué crack quillo! ${emote}`);
  } else {
    client.say(channel, `¡${username} regala sub a ${recipient}! Eso es generosidad illo! ${emote}`);
  }

  // Track subgift for summary
  streamSummaryManager.trackSubGift(username, recipient);
});

client.on('submysterygift', (channel: string, username: string, numbOfSubs: number) => {
  const emote = memoryManager.getEmote('clap');
  if (username.toLowerCase() === 'mariajosobrasada') {
    client.say(channel, `¡OZÚUU! ¡La reina Mariajo regala ${numbOfSubs} subs! 👸👸👸 ${emote}`);
  } else {
    client.say(channel, `¡${username} regala ${numbOfSubs} subs! Eso es ser crack illo! ${emote}`);
  }

  // Track mystery gift for summary
  streamSummaryManager.trackMysteryGift(username, numbOfSubs);
});

// ===========================================
// RAIDS
// ===========================================

client.on('raided', (channel: string, username: string, viewers: number) => {
  const emote = memoryManager.getEmote('happy');

  if (viewers >= 10) {
    client.say(channel, `¡RAID de ${username} con ${viewers} personas! Bienvenidos todos illo! ${emote} ${emote}`);
  } else {
    client.say(channel, `¡${username} viene de raid con ${viewers}! Pasad y poneos cómodos quillo! ${emote}`);
  }

  // Track raid for summary
  streamSummaryManager.trackRaid(username, viewers);
});

// ===========================================
// BITS
// ===========================================

client.on('cheer', (channel: string, tags: ChatUserstate) => {
  const username = tags['display-name'] || tags.username || '';
  const bits = parseInt(tags.bits || '0', 10);
  const emote = memoryManager.getEmote('love');

  if (bits >= 100) {
    client.say(channel, `¡Ozú ${username}! ¡${bits} bits! Eso es mucho amor miarma! ${emote}`);
  } else {
    client.say(channel, `¡Gracias por los ${bits} bits ${username}! ${emote}`);
  }

  // Track bits for summary
  streamSummaryManager.trackBits(username, bits);
});

// ===========================================
// CONNECTION
// ===========================================

console.log('📖 Contexto y eventos de Twitch cargados');

client.on('connected', (addr: string, port: number) => {
  console.log(`Bot conectado a ${addr}:${port}`);
  console.log(`Canal: ${CONFIG.channel}`);
  console.log(`Usuario: ${CONFIG.botUsername}`);
  console.log('Escuchando comandos...');
  setAlertClient(client, CONFIG.channel);
  startPiropoTimer(client, CONFIG.channel);

  // Start periodic summary generation
  streamSummaryManager.startPeriodicSummaries('es');

  tokenManager.startAutoValidation();
});

client.on('disconnected', (reason: string) => {
  console.log('Bot desconectado:', reason);
});

if (!CONFIG.clientId || !CONFIG.clientSecret) {
  console.error('Error: Faltan TWITCH_CLIENT_ID o TWITCH_CLIENT_SECRET en .env');
  process.exit(1);
}

client.connect().catch((err: Error) => {
  console.error('Error al conectar:', err.message);
  process.exit(1);
});
