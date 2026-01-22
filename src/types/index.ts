// ===========================================
// TWITCH TYPES
// ===========================================

export interface TwitchUserstate {
  'badge-info'?: { [key: string]: string };
  badges?: { [key: string]: string };
  color?: string;
  'display-name'?: string;
  emotes?: { [key: string]: string[] };
  id?: string;
  mod?: boolean;
  'room-id'?: string;
  subscriber?: boolean;
  'tmi-sent-ts'?: string;
  turbo?: boolean;
  'user-id'?: string;
  'user-type'?: string;
  username?: string;
  'msg-id'?: string;
  'msg-param-category'?: string;
  'msg-param-value'?: string;
  bits?: string;
}

export interface TwitchConfig {
  clientId: string;
  clientSecret: string;
  channel: string;
  botUsername: string;
  defaultDuration: number;
  minDuration: number;
  maxDuration: number;
  cooldownMs: number;
}

// ===========================================
// TOKEN TYPES
// ===========================================

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: string | null;
  lastUpdated: string;
}

export interface TokenValidationResult {
  valid: boolean;
  reason?: string;
  expiresIn?: number;
  login?: string;
}

export interface TokenRefreshEvent {
  oldToken: string;
  newToken: string;
}

// ===========================================
// COMMUNITY TYPES
// ===========================================

export type UserRole = 'REINA 👸' | 'MOD 🛡️' | 'VIP 👑' | 'SUB ⭐' | 'BOT 🤖' | 'viewer';

export type EmoteCategory = 'happy' | 'love' | 'clap' | 'sad' | 'funny' | 'rock';

export interface Community {
  reina: string[];
  mods: string[];
  vips: string[];
  subs: string[];
  gifters: Record<string, number>;
  bots: string[];
}

export interface Emotes {
  happy: string[];
  love: string[];
  clap: string[];
  sad: string[];
  funny: string[];
  rock: string[];
}

// ===========================================
// MEMORY TYPES
// ===========================================

export interface UserMemory {
  lastTopics: string[];
  lastInteraction: string | null;
  interactionCount: number;
}

export interface WatchStreak {
  streak: number;
  lastSeen: string;
  maxStreak: number;
}

export interface MemoryStats {
  totalSearches: number;
  totalInteractions: number;
  botStartedAt: string | null;
}

export interface MemoryData {
  users: Record<string, UserMemory>;
  watchStreaks: Record<string, WatchStreak>;
  stats: MemoryStats;
}

// ===========================================
// SEARCH TYPES
// ===========================================

export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

export interface SearchTimings {
  brave?: number;
  groq?: number;
  total?: number;
}

// ===========================================
// AI TYPES
// ===========================================

export interface AIResponse {
  response: string;
  debug: {
    userPrompt: string;
    systemPrompt: string;
    braveResults: SearchResult[];
  };
}

// ===========================================
// DISCORD TYPES
// ===========================================

export interface ClipData {
  url: string;
  title?: string;
  creator: string;
  duration: number;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  thumbnail?: { url: string };
  image?: { url: string };
  footer?: { text: string };
  timestamp?: string;
}

// ===========================================
// TIER TYPES
// ===========================================

export type TierName = 'reina' | 'broadcaster' | 'mod' | 'vip' | 'T3' | 'T2' | 'T1' | 'none';

export interface TierInfo {
  tier: TierName;
  limit: number;
}

// ===========================================
// LOGGING TYPES
// ===========================================

export type LogAction = 'fact' | 'llm' | 'llm+search' | 'clip' | 'system';

export interface LogEntry {
  timestamp: string;
  user: string;
  command: string;
  result: string;
  action: LogAction;
  tier: TierName | null;
  used: number | null;
  limit: number | null;
  watched: boolean;
  searchQuery?: string;
  braveResults?: SearchResult[];
  groqPrompt?: string;
}

// ===========================================
// USAGE TYPES
// ===========================================

export interface UserUsage {
  tier: number;
  used: number;
  limit: number;
  timestamps: string[];
  searches?: number;
}

export interface UsageData {
  startedAt: string;
  users: Record<string, UserUsage>;
}

// ===========================================
// LITERALES TYPES
// ===========================================

export type SupportedLanguage = 'es' | 'en' | 'af';

export interface MultiLangText {
  es: string;
  en: string;
  af: string;
}

export interface MultiLangArray {
  es: string[];
  en: string[];
  af: string[];
}

export interface MultiLangMessages {
  es: Record<string, string>;
  en: Record<string, string>;
  af: Record<string, string>;
}

export interface Literales {
  system_prompt: MultiLangText;
  facts: MultiLangArray;
  piropos: MultiLangArray;
  fallback_ia: MultiLangText;
  idiomas: Record<string, string>;
  mensajes_bot: MultiLangMessages;
}

// ===========================================
// STREAM SUMMARY TYPES
// ===========================================

export type StreamEventType = 'clip' | 'sub' | 'resub' | 'subgift' | 'mysterygift' | 'raid' | 'bits' | 'search' | 'command';

export interface StreamEvent {
  type: StreamEventType;
  timestamp: string;
  username: string;
  data: Record<string, string | number | undefined>;
}

export interface MiniSummary {
  periodStart: string;
  periodEnd: string;
  summary: string;
  eventCount: number;
}

export interface StreamSummaryData {
  streamStartedAt: string;
  events: StreamEvent[];
  miniSummaries: MiniSummary[];
  activeUsers: Set<string>;
}
