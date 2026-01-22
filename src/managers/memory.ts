import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UserRole,
  EmoteCategory,
  Community,
  Emotes,
  MemoryData,
  UserMemory,
  WatchStreak,
} from '../types/index.js';
import { INTERVALS } from '../config/constants.js';
import { sanitizeUserInput } from '../utils/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTEXTO_PATH = path.join(__dirname, '../../CONTEXTO.md');
const MEMORY_PATH = path.join(__dirname, '../../data/memory.json');

export class MemoryManager {
  private memory: MemoryData;
  private contexto: string = '';
  private community: Community;
  private emotes: Emotes;

  constructor(community: Community, emotes: Emotes) {
    this.community = community;
    this.emotes = emotes;
    this.memory = this.loadMemory();
    this.loadContext();
  }

  /**
   * Carga la memoria desde archivo
   */
  private loadMemory(): MemoryData {
    try {
      if (!fs.existsSync(MEMORY_PATH)) {
        const dir = path.dirname(MEMORY_PATH);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const initial: MemoryData = {
          users: {},
          watchStreaks: {},
          stats: {
            totalSearches: 0,
            totalInteractions: 0,
            botStartedAt: new Date().toISOString(),
          },
        };
        fs.writeFileSync(MEMORY_PATH, JSON.stringify(initial, null, 2));
        return initial;
      }
      return JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
    } catch (err) {
      console.error('Error cargando memoria:', err);
      return {
        users: {},
        watchStreaks: {},
        stats: { totalSearches: 0, totalInteractions: 0, botStartedAt: null },
      };
    }
  }

  /**
   * Guarda la memoria a archivo
   */
  private saveMemory(): void {
    try {
      fs.writeFileSync(MEMORY_PATH, JSON.stringify(this.memory, null, 2));
    } catch (err) {
      console.error('Error guardando memoria:', err);
    }
  }

  /**
   * Carga el contexto del canal
   */
  loadContext(): string {
    try {
      this.contexto = fs.readFileSync(CONTEXTO_PATH, 'utf8');
      return this.contexto;
    } catch (err) {
      console.error('Error cargando CONTEXTO.md:', err);
      return '';
    }
  }

  /**
   * Obtiene el contexto actual
   */
  getContext(): string {
    return this.contexto;
  }

  /**
   * Detecta el rol de un usuario
   */
  detectRole(username: string): UserRole {
    const user = username.toLowerCase();
    if (this.community.bots.includes(user)) return 'BOT 🤖';
    if (this.community.reina.includes(user)) return 'REINA 👸';
    if (this.community.mods.includes(user)) return 'MOD 🛡️';
    if (this.community.vips.includes(user)) return 'VIP 👑';
    if (this.community.subs.includes(user)) return 'SUB ⭐';
    return 'viewer';
  }

  /**
   * Obtiene info de gifter
   */
  getGifterInfo(username: string): number {
    const user = username.toLowerCase();
    return this.community.gifters[user] || 0;
  }

  /**
   * Obtiene un emote aleatorio de una categoría
   */
  getEmote(category: EmoteCategory = 'happy'): string {
    const emoteList = this.emotes[category] || this.emotes.happy;
    return emoteList[Math.floor(Math.random() * emoteList.length)];
  }

  /**
   * Obtiene la memoria de un usuario
   */
  getMemory(username: string): UserMemory | null {
    const user = username.toLowerCase();
    return this.memory.users[user] || null;
  }

  /**
   * Actualiza la memoria de un usuario
   */
  updateMemory(username: string, topic: string): void {
    const user = username.toLowerCase();
    // Sanitize topic before storing to prevent persistent injection
    const sanitizedTopic = sanitizeUserInput(topic, 100);

    if (!this.memory.users[user]) {
      this.memory.users[user] = {
        lastTopics: [],
        lastInteraction: null,
        interactionCount: 0,
      };
    }
    this.memory.users[user].lastTopics = [
      sanitizedTopic,
      ...this.memory.users[user].lastTopics,
    ].slice(0, 3);
    this.memory.users[user].lastInteraction = new Date().toISOString();
    this.memory.users[user].interactionCount++;
    this.memory.stats.totalInteractions++;
    this.saveMemory();
    console.log('🧠 Memoria actualizada:', username, sanitizedTopic);
  }

  /**
   * Obtiene el watch streak de un usuario
   */
  getWatchStreak(username: string): WatchStreak | null {
    const user = username.toLowerCase();
    return this.memory.watchStreaks[user] || null;
  }

  /**
   * Actualiza el watch streak de un usuario
   */
  updateWatchStreak(username: string, streak: number): void {
    const user = username.toLowerCase();
    const current = this.memory.watchStreaks[user];
    this.memory.watchStreaks[user] = {
      streak,
      lastSeen: new Date().toISOString(),
      maxStreak: Math.max(streak, current?.maxStreak || 0),
    };
    this.saveMemory();
    console.log('🔥 Watch Streak guardado:', username, streak);
  }

  /**
   * Incrementa el contador de búsquedas
   */
  incrementSearches(): void {
    this.memory.stats.totalSearches++;
    this.saveMemory();
  }

  /**
   * Limpia memorias antiguas (>30 min)
   */
  cleanOldMemories(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const user in this.memory.users) {
      const lastInteraction = this.memory.users[user].lastInteraction;
      if (lastInteraction && now - new Date(lastInteraction).getTime() > INTERVALS.memoryCleanup) {
        delete this.memory.users[user];
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.saveMemory();
      console.log('🧹 Memorias limpiadas:', cleaned);
    }

    return cleaned;
  }

  /**
   * Obtiene las estadísticas
   */
  getStats(): typeof this.memory.stats {
    return this.memory.stats;
  }

  /**
   * Obtiene la comunidad configurada
   */
  getCommunity(): Community {
    return this.community;
  }

  /**
   * Obtiene los emotes configurados
   */
  getEmotes(): Emotes {
    return this.emotes;
  }
}

export default MemoryManager;
