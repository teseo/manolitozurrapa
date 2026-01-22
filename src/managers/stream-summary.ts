import Groq from 'groq-sdk';
import type {
  StreamEvent,
  StreamEventType,
  MiniSummary,
  SupportedLanguage,
} from '../types/index.js';
import { INTERVALS } from '../config/constants.js';

interface StreamSummaryConfig {
  groqApiKey: string;
  model?: string;
}

export class StreamSummaryManager {
  private groq: Groq;
  private model: string;
  private streamStartedAt: string;
  private events: StreamEvent[] = [];
  private miniSummaries: MiniSummary[] = [];
  private activeUsers: Set<string> = new Set();
  private lastSummaryTime: number;
  private summaryInterval: NodeJS.Timeout | null = null;

  constructor(config: StreamSummaryConfig) {
    this.groq = new Groq({ apiKey: config.groqApiKey });
    this.model = config.model || 'llama-3.3-70b-versatile';
    this.streamStartedAt = new Date().toISOString();
    this.lastSummaryTime = Date.now();
  }

  /**
   * Registra un evento del stream
   */
  trackEvent(
    type: StreamEventType,
    username: string,
    data: Record<string, string | number | undefined> = {}
  ): void {
    const event: StreamEvent = {
      type,
      timestamp: new Date().toISOString(),
      username,
      data,
    };
    this.events.push(event);
    this.activeUsers.add(username.toLowerCase());

    console.log(`📊 Evento trackeado: ${type} por ${username}`);
  }

  /**
   * Registra un clip creado
   */
  trackClip(username: string, clipUrl: string, title?: string, duration?: number): void {
    this.trackEvent('clip', username, { clipUrl, title, duration });
  }

  /**
   * Registra una suscripción
   */
  trackSub(username: string, months?: number, tier?: string): void {
    this.trackEvent('sub', username, { months, tier });
  }

  /**
   * Registra una resuscripción
   */
  trackResub(username: string, months: number): void {
    this.trackEvent('resub', username, { months });
  }

  /**
   * Registra un sub regalado
   */
  trackSubGift(gifter: string, recipient: string): void {
    this.trackEvent('subgift', gifter, { recipient });
  }

  /**
   * Registra subs misteriosos
   */
  trackMysteryGift(gifter: string, count: number): void {
    this.trackEvent('mysterygift', gifter, { count });
  }

  /**
   * Registra una raid
   */
  trackRaid(raider: string, viewers: number): void {
    this.trackEvent('raid', raider, { viewers });
  }

  /**
   * Registra bits
   */
  trackBits(username: string, amount: number): void {
    this.trackEvent('bits', username, { amount });
  }

  /**
   * Registra una búsqueda
   */
  trackSearch(username: string, query: string): void {
    this.trackEvent('search', username, { query });
  }

  /**
   * Registra uso de un comando
   */
  trackCommand(username: string, command: string): void {
    this.trackEvent('command', username, { command });
  }

  /**
   * Obtiene eventos desde la última generación de resumen
   */
  private getRecentEvents(): StreamEvent[] {
    const lastSummaryDate = new Date(this.lastSummaryTime).toISOString();
    return this.events.filter((e) => e.timestamp > lastSummaryDate);
  }

  /**
   * Formatea eventos para el prompt del LLM
   */
  private formatEventsForPrompt(events: StreamEvent[]): string {
    if (events.length === 0) return 'No hubo eventos significativos en este período.';

    const grouped: Record<string, StreamEvent[]> = {};
    for (const event of events) {
      if (!grouped[event.type]) grouped[event.type] = [];
      grouped[event.type].push(event);
    }

    const lines: string[] = [];

    if (grouped.clip) {
      lines.push(`CLIPS (${grouped.clip.length}):`);
      for (const e of grouped.clip) {
        lines.push(`  - ${e.username} creó clip: "${e.data.title || 'Sin título'}"`);
      }
    }

    if (grouped.sub || grouped.resub) {
      const subs = [...(grouped.sub || []), ...(grouped.resub || [])];
      lines.push(`SUSCRIPCIONES (${subs.length}):`);
      for (const e of subs) {
        if (e.type === 'resub') {
          lines.push(`  - ${e.username} (resub ${e.data.months} meses)`);
        } else {
          lines.push(`  - ${e.username} (nuevo sub)`);
        }
      }
    }

    if (grouped.subgift || grouped.mysterygift) {
      const gifts = [...(grouped.subgift || []), ...(grouped.mysterygift || [])];
      lines.push(`SUBS REGALADOS:`);
      for (const e of gifts) {
        if (e.type === 'mysterygift') {
          lines.push(`  - ${e.username} regaló ${e.data.count} subs`);
        } else {
          lines.push(`  - ${e.username} regaló sub a ${e.data.recipient}`);
        }
      }
    }

    if (grouped.raid) {
      lines.push(`RAIDS (${grouped.raid.length}):`);
      for (const e of grouped.raid) {
        lines.push(`  - ${e.username} con ${e.data.viewers} viewers`);
      }
    }

    if (grouped.bits) {
      const totalBits = grouped.bits.reduce((sum, e) => sum + (Number(e.data.amount) || 0), 0);
      lines.push(`BITS: ${totalBits} bits de ${grouped.bits.length} usuarios`);
    }

    if (grouped.search) {
      lines.push(`BÚSQUEDAS (${grouped.search.length}):`);
      const topSearches = grouped.search.slice(0, 5);
      for (const e of topSearches) {
        lines.push(`  - ${e.username}: "${e.data.query}"`);
      }
      if (grouped.search.length > 5) {
        lines.push(`  ... y ${grouped.search.length - 5} más`);
      }
    }

    lines.push(`\nUSUARIOS ACTIVOS: ${this.activeUsers.size}`);

    return lines.join('\n');
  }

  /**
   * Genera un mini-resumen del período actual
   */
  async generateMiniSummary(lang: SupportedLanguage = 'es'): Promise<string | null> {
    const recentEvents = this.getRecentEvents();

    if (recentEvents.length === 0) {
      console.log('📊 No hay eventos nuevos para resumir');
      return null;
    }

    const periodStart = new Date(this.lastSummaryTime).toISOString();
    const periodEnd = new Date().toISOString();
    const eventsText = this.formatEventsForPrompt(recentEvents);

    const langPrompts: Record<SupportedLanguage, string> = {
      es: 'Genera un resumen MUY BREVE (2-3 frases) de lo que pasó en este período del stream. Usa tono casual y divertido estilo andaluz.',
      en: 'Generate a VERY BRIEF summary (2-3 sentences) of what happened during this stream period. Use casual, fun tone.',
      af: 'Genereer \'n BAIE KORT opsomming (2-3 sinne) van wat tydens hierdie stroom periode gebeur het. Gebruik \'n gemaklike, pret toon.',
    };

    const systemPrompt = `Eres un asistente que resume eventos de streams de Twitch. ${langPrompts[lang]}`;

    try {
      const response = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `EVENTOS DEL PERÍODO:\n${eventsText}` },
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      const summary = response.choices[0]?.message?.content || '';

      if (summary) {
        this.miniSummaries.push({
          periodStart,
          periodEnd,
          summary,
          eventCount: recentEvents.length,
        });

        this.lastSummaryTime = Date.now();
        console.log(`📝 Mini-resumen generado (${recentEvents.length} eventos)`);
      }

      return summary;
    } catch (error) {
      console.error('Error generando mini-resumen:', (error as Error).message);
      return null;
    }
  }

  /**
   * Genera el resumen final combinando todos los mini-resúmenes
   */
  async generateFinalSummary(lang: SupportedLanguage = 'es'): Promise<string> {
    // Primero generar resumen del período actual si hay eventos
    const pendingEvents = this.getRecentEvents();
    if (pendingEvents.length > 0) {
      await this.generateMiniSummary(lang);
    }

    if (this.miniSummaries.length === 0) {
      const noDataMsgs: Record<SupportedLanguage, string> = {
        es: 'Illo, no tengo ná que resumir. El stream ha estado tranquilito.',
        en: 'Mate, nothing to summarize. Stream\'s been quiet.',
        af: 'Boet, niks om op te som nie. Die stroom was stil.',
      };
      return noDataMsgs[lang];
    }

    const streamDuration = this.getStreamDuration();
    const totalEvents = this.events.length;

    const summariesText = this.miniSummaries
      .map((s, i) => `[Período ${i + 1}] ${s.summary}`)
      .join('\n\n');

    const langPrompts: Record<SupportedLanguage, string> = {
      es: `Combina estos mini-resúmenes en UN SOLO resumen final del stream.
Mantén el tono andaluz divertido. Máximo 400 caracteres.
Incluye los momentos más destacados y menciona usuarios importantes.`,
      en: `Combine these mini-summaries into ONE final stream summary.
Keep a fun, casual tone. Maximum 400 characters.
Include the highlights and mention important users.`,
      af: `Kombineer hierdie mini-opsommings in EEN finale stroom opsomming.
Hou \'n pret, gemaklike toon. Maksimum 400 karakters.
Sluit die hoogtepunte in en noem belangrike gebruikers.`,
    };

    const systemPrompt = langPrompts[lang];

    try {
      const response = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `DURACIÓN DEL STREAM: ${streamDuration}
TOTAL DE EVENTOS: ${totalEvents}
USUARIOS ACTIVOS: ${this.activeUsers.size}

MINI-RESÚMENES:
${summariesText}`,
          },
        ],
        max_tokens: 250,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || 'Error generando resumen final';
    } catch (error) {
      console.error('Error generando resumen final:', (error as Error).message);
      return 'Error generando el resumen. Inténtalo de nuevo.';
    }
  }

  /**
   * Obtiene la duración del stream en formato legible
   */
  private getStreamDuration(): string {
    const startTime = new Date(this.streamStartedAt).getTime();
    const now = Date.now();
    const diffMs = now - startTime;

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} minutos`;
  }

  /**
   * Inicia el timer de resúmenes periódicos
   */
  startPeriodicSummaries(lang: SupportedLanguage = 'es'): void {
    if (this.summaryInterval) return;

    this.summaryInterval = setInterval(async () => {
      console.log('⏰ Generando mini-resumen periódico...');
      await this.generateMiniSummary(lang);
    }, INTERVALS.summaryInterval);

    console.log(`📊 Timer de resúmenes iniciado (cada ${INTERVALS.summaryInterval / 60000} min)`);
  }

  /**
   * Detiene el timer de resúmenes
   */
  stopPeriodicSummaries(): void {
    if (this.summaryInterval) {
      clearInterval(this.summaryInterval);
      this.summaryInterval = null;
      console.log('📊 Timer de resúmenes detenido');
    }
  }

  /**
   * Resetea el manager para un nuevo stream
   */
  reset(): void {
    this.stopPeriodicSummaries();
    this.events = [];
    this.miniSummaries = [];
    this.activeUsers = new Set();
    this.streamStartedAt = new Date().toISOString();
    this.lastSummaryTime = Date.now();
    console.log('📊 StreamSummaryManager reseteado');
  }

  /**
   * Obtiene estadísticas del stream actual
   */
  getStats(): {
    duration: string;
    eventCount: number;
    activeUsers: number;
    miniSummaries: number;
  } {
    return {
      duration: this.getStreamDuration(),
      eventCount: this.events.length,
      activeUsers: this.activeUsers.size,
      miniSummaries: this.miniSummaries.length,
    };
  }
}

export default StreamSummaryManager;
