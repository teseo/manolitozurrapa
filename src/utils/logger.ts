import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LogEntry, LogAction, TierName, SearchResult } from '../types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = path.join(__dirname, '../../logs');

// Crear directorio de logs si no existe
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Nombre del archivo de log de esta sesión
const sessionStart = new Date();
const logFileName = `session_${sessionStart.toISOString().replace(/[:.]/g, '-').slice(0, 19)}.jsonl`;
const logFilePath = path.join(LOGS_DIR, logFileName);

/**
 * Obtiene timestamp formateado HH:MM:SS
 */
export function getTimestamp(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
}

/**
 * Escribe una entrada de log
 */
export function log(
  user: string,
  command: string,
  result: string,
  options: {
    action?: LogAction;
    tier?: TierName | null;
    used?: number | null;
    limit?: number | null;
    watched?: boolean;
    searchQuery?: string;
    braveResults?: SearchResult[];
    groqPrompt?: string;
  } = {}
): void {
  const now = new Date();

  const logEntry: LogEntry = {
    timestamp: now.toISOString(),
    user: user.toLowerCase(),
    command,
    result,
    action: options.action || 'system',
    tier: options.tier || null,
    used: options.used ?? null,
    limit: options.limit ?? null,
    watched: options.watched || false,
  };

  // Añadir campos de debug para búsquedas
  if (options.searchQuery) logEntry.searchQuery = options.searchQuery;
  if (options.braveResults) logEntry.braveResults = options.braveResults;
  if (options.groqPrompt) logEntry.groqPrompt = options.groqPrompt;

  // Escribir a archivo JSONL
  fs.appendFileSync(logFilePath, JSON.stringify(logEntry) + '\n');

  // Salida a consola
  const time = getTimestamp();
  const tierLabel = options.limit === Infinity
    ? `${options.tier}: inf`
    : (options.tier ? `${options.tier}: ${options.used}/${options.limit}` : '');
  const userPart = tierLabel ? `${user} (${tierLabel})` : user;
  const truncated = result.length > 50 ? result.slice(0, 50) + '...' : result;
  const actionTag = options.action ? `[${options.action.toUpperCase()}]` : '';

  if (options.watched) {
    console.log(`[${time}] ⚠️ VIGILADO ${actionTag} ${userPart} | ${command} | ${truncated}`);
  } else {
    console.log(`[${time}] ${actionTag} ${userPart} | ${command} | ${truncated}`);
  }
}

/**
 * Log detallado para búsquedas
 */
export function logSearch(
  query: string,
  results: SearchResult[],
  prompt: string,
  response: string,
  timings: { brave: number; llm: number; total: number },
  provider: string = 'LLM'
): void {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 BÚSQUEDA');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('Query:', query);
  console.log('');
  console.log('───────────────────────────────────────────────────────────');
  console.log(`📄 RESULTADOS DE BRAVE (${results.length} fuentes)`);
  console.log('───────────────────────────────────────────────────────────');

  results.forEach((r, i) => {
    console.log('');
    console.log(`[${i + 1}] ${r.title}`);
    console.log(`    ${r.url}`);
    console.log(`    ${r.description}`);
  });

  console.log('');
  console.log('───────────────────────────────────────────────────────────');
  console.log(`🤖 PROMPT ENVIADO A ${provider.toUpperCase()}`);
  console.log('───────────────────────────────────────────────────────────');
  console.log('');
  console.log(prompt);
  console.log('');
  console.log('───────────────────────────────────────────────────────────');
  console.log(`💬 RESPUESTA DE ${provider.toUpperCase()}`);
  console.log('───────────────────────────────────────────────────────────');
  console.log('');
  console.log(response);
  console.log('');
  console.log('📏 Longitud:', response.length, 'chars');
  console.log('');
  console.log('⏱️ Brave:', timings.brave, 'ms');
  console.log(`⏱️ ${provider}:`, timings.llm, 'ms');
  console.log('⏱️ Total:', timings.total, 'ms');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
}
