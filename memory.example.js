import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTEXTO_PATH = path.join(__dirname, 'CONTEXTO.md');
const MEMORY_PATH = path.join(__dirname, 'data', 'memory.json');

// ===========================================
// CONFIGURACIÓN DE TU COMUNIDAD
// ===========================================
// Copia este archivo a memory.js y personaliza con tu comunidad

export const COMMUNITY = {
  // Usuarios VIP especiales (tratamiento de "realeza")
  reina: ['tu_usuario_especial'],

  // Moderadores del canal
  mods: ['mod1', 'mod2', 'mod3'],

  // VIPs del canal
  vips: ['vip1', 'vip2', 'vip3'],

  // Suscriptores destacados
  subs: ['sub1', 'sub2', 'sub3'],

  // Usuarios que han regalado subs { username: cantidad }
  gifters: { 'gifter1': 5, 'gifter2': 2 },

  // Bots conocidos (para ignorar o tratar diferente)
  bots: ['streamelements', 'streamlabs', 'nightbot', 'tu_bot']
};

// ===========================================
// EMOTES DEL CANAL
// ===========================================
// Personaliza con los emotes de tu canal

export const EMOTES = {
  happy: ['canalFeliz', 'canalHappy'],
  love: ['canalCorazon', 'canalLove'],
  clap: ['canalClap', 'canalGG'],
  sad: ['canalSad', 'canalCry'],
  funny: ['canalLOL', 'canalJaja'],
  rock: ['canalRock', 'canalMetal']
};

// ===========================================
// NO MODIFICAR DEBAJO DE ESTA LÍNEA
// ===========================================

let memory = null;
let contexto = null;

// Obtener emote aleatorio por categoría
export function getEmote(category = 'happy') {
  const emoteList = EMOTES[category] || EMOTES.happy;
  return emoteList[Math.floor(Math.random() * emoteList.length)];
}

// Cargar memoria
export function loadMemory() {
  try {
    if (!fs.existsSync(MEMORY_PATH)) {
      const dir = path.dirname(MEMORY_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const initial = { users: {}, watchStreaks: {}, stats: { totalSearches: 0, totalInteractions: 0, botStartedAt: new Date().toISOString() } };
      fs.writeFileSync(MEMORY_PATH, JSON.stringify(initial, null, 2));
      memory = initial;
    } else {
      memory = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
    }
  } catch (err) {
    console.error('Error cargando memoria:', err);
    memory = { users: {}, watchStreaks: {}, stats: {} };
  }
  return memory;
}

export function saveMemory() {
  try {
    fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2));
  } catch (err) {
    console.error('Error guardando memoria:', err);
  }
}

// Cargar contexto
export function loadContext() {
  try {
    contexto = fs.readFileSync(CONTEXTO_PATH, 'utf8');
    return contexto;
  } catch (err) {
    console.error('Error cargando CONTEXTO.md:', err);
    return '';
  }
}

// Detectar rol
export function detectRole(username) {
  const user = username.toLowerCase();
  if (COMMUNITY.bots.includes(user)) return 'BOT 🤖';
  if (COMMUNITY.reina.includes(user)) return 'REINA 👸';
  if (COMMUNITY.mods.includes(user)) return 'MOD 🛡️';
  if (COMMUNITY.vips.includes(user)) return 'VIP 👑';
  if (COMMUNITY.subs.includes(user)) return 'SUB ⭐';
  return 'viewer';
}

// Info de gifter
export function getGifterInfo(username) {
  const user = username.toLowerCase();
  return COMMUNITY.gifters[user] || 0;
}

// Memoria de usuario
export function getMemory(username) {
  const user = username.toLowerCase();
  return memory?.users?.[user] || null;
}

export function updateMemory(username, topic) {
  const user = username.toLowerCase();
  if (!memory.users[user]) {
    memory.users[user] = { lastTopics: [], lastInteraction: null, interactionCount: 0 };
  }
  memory.users[user].lastTopics = [topic, ...memory.users[user].lastTopics].slice(0, 3);
  memory.users[user].lastInteraction = new Date().toISOString();
  memory.users[user].interactionCount++;
  memory.stats.totalInteractions++;
  saveMemory();
  console.log('🧠 Memoria actualizada:', username, topic);
}

// Watch Streaks
export function getWatchStreak(username) {
  const user = username.toLowerCase();
  return memory?.watchStreaks?.[user] || null;
}

export function updateWatchStreak(username, streak) {
  const user = username.toLowerCase();
  const current = memory.watchStreaks[user];
  memory.watchStreaks[user] = {
    streak,
    lastSeen: new Date().toISOString(),
    maxStreak: Math.max(streak, current?.maxStreak || 0)
  };
  saveMemory();
  console.log('🔥 Watch Streak guardado:', username, streak);
}

// Limpiar memorias viejas (>30 min)
export function cleanOldMemories() {
  const now = Date.now();
  const limit = 30 * 60 * 1000;
  let cleaned = 0;
  for (const user in memory.users) {
    if (now - new Date(memory.users[user].lastInteraction).getTime() > limit) {
      delete memory.users[user];
      cleaned++;
    }
  }
  if (cleaned > 0) {
    saveMemory();
    console.log('🧹 Memorias limpiadas:', cleaned);
  }
}

// Inicializar
loadMemory();
