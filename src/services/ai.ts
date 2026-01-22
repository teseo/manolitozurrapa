import Groq from 'groq-sdk';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AIResponse, SearchResult, Literales, SupportedLanguage } from '../types/index.js';
import type { MemoryManager } from '../managers/memory.js';
import { sanitizeUserInput, wrapUserContent } from '../utils/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LITERALES_PATH = path.join(__dirname, '../../literales.json');

interface AIServiceConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export class AIService {
  private groq: Groq;
  private literales: Literales;
  private memory: MemoryManager;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: AIServiceConfig, memory: MemoryManager) {
    this.groq = new Groq({ apiKey: config.apiKey });
    this.memory = memory;
    this.model = config.model || 'llama-3.3-70b-versatile';
    this.maxTokens = config.maxTokens || 200;
    this.temperature = config.temperature || 0.7;
    this.literales = this.loadLiterales();
  }

  private loadLiterales(): Literales {
    try {
      return JSON.parse(fs.readFileSync(LITERALES_PATH, 'utf-8'));
    } catch (err) {
      console.error('Error cargando literales.json:', err);
      return {
        system_prompt: { es: '', en: '', af: '' },
        idiomas: { es: 'español', en: 'english', af: 'afrikaans' },
        mensajes_bot: { es: {}, en: {}, af: {} },
        fallback_ia: { es: 'Illo me he quedao frito, pregunta luego', en: 'Mate, my brain crashed. Ask later.', af: 'Eish boet, ek het gecrash. Vra later.' },
        piropos: { es: [], en: [], af: [] },
        facts: { es: [], en: [], af: [] },
      };
    }
  }

  /**
   * Pregunta simple a Manolito (sin búsqueda)
   */
  async ask(userMessage: string, username: string = 'viewer', lang: SupportedLanguage = 'es'): Promise<string> {
    // Sanitizar input del usuario
    const sanitizedMessage = sanitizeUserInput(userMessage);
    const wrappedMessage = wrapUserContent(sanitizedMessage);

    const userRole = this.memory.detectRole(username);
    const userMemory = this.memory.getMemory(username);
    const systemPrompt = this.literales.system_prompt[lang] || this.literales.system_prompt.es;

    const contextPrompt = `
${systemPrompt}

USUARIO: ${username}
ROL: ${userRole}
${userMemory ? `HISTORIAL: ${userMemory.lastTopics.join(', ')}` : 'Primera interacción'}

IMPORTANTE:
- Si es Mariajosobrasada, trátala como reina 👸
- Si es MOD/VIP/SUB, reconoce su estatus
`;

    const response = await this.groq.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: contextPrompt },
        { role: 'user', content: wrappedMessage },
      ],
      max_tokens: 150,
      temperature: this.temperature,
    });

    const result = response.choices[0]?.message?.content || this.getFallback(lang);

    // Actualizar memoria
    this.memory.updateMemory(username, userMessage.slice(0, 50));

    return result;
  }

  /**
   * Pregunta a Manolito con resultados de búsqueda
   */
  async askWithSearch(
    question: string,
    searchResults: SearchResult[],
    username: string = 'viewer',
    timings: { groq?: number } = {},
    lang: SupportedLanguage = 'es'
  ): Promise<AIResponse> {
    const startGroq = Date.now();

    // Sanitizar input del usuario
    const sanitizedQuestion = sanitizeUserInput(question);

    const contexto = this.memory.getContext();
    const userRole = this.memory.detectRole(username);
    const userMemory = this.memory.getMemory(username);
    const userStreak = this.memory.getWatchStreak(username);

    console.log(`🔍 Búsqueda de ${username} (${userRole}): ${sanitizedQuestion}`);

    // Construir fuentes con formato mejorado
    // Sanitize external content to prevent prompt injection via malicious pages
    const sourcesText = searchResults
      .map((r, i) => {
        const domain = this.capitalizeFirst(this.extractDomain(r.url));
        const safeTitle = sanitizeUserInput(r.title, 100);
        const safeDesc = sanitizeUserInput(r.description, 200);
        return `${i + 1}. [${domain}] ${safeTitle}: ${safeDesc}`;
      })
      .join('\n');

    // Obtener nombre del idioma para las instrucciones
    const langNames: Record<SupportedLanguage, string> = {
      es: 'Spanish (Andalusian style)',
      en: 'English (British/Australian casual)',
      af: 'Afrikaans (South African casual)'
    };
    const langName = langNames[lang] || langNames.es;
    const personalityPrompt = this.literales.system_prompt[lang] || this.literales.system_prompt.es;

    const systemPrompt = `
${personalityPrompt}

CHANNEL CONTEXT:
${contexto}

USER: ${username}
ROLE: ${userRole}
${userStreak ? `WATCH STREAK: ${userStreak.streak} streams` : ''}
${userMemory ? `HISTORY: ${userMemory.lastTopics.join(', ')}` : 'First interaction'}

CRITICAL:
- RESPOND IN ${langName.toUpperCase()}
- Max 350 characters
- Add ONE channel emote at the end: teseoFeliz, teseoCorazon, teseoClap, teseoRisitas, teseoHappy
- If user is Mariajosobrasada or Glorimar97, treat as queen 👸
`;

    const userPrompt = `SEARCH SOURCES (by relevance):
${sourcesText}

USER QUESTION:
<user_message>${sanitizedQuestion}</user_message>

INSTRUCTIONS:
- Synthesize info from sources to answer the user question
- Give CONCRETE answer with specific data
- Prioritize reliable sources (Wikipedia, official sites)
- DO NOT invent data not in sources
- Max 350 characters
- RESPOND IN ${langName.toUpperCase()}
- Add channel emote at end`;

    const response = await this.groq.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: this.maxTokens,
      temperature: this.temperature,
    });

    const endGroq = Date.now();
    timings.groq = endGroq - startGroq;

    let text = response.choices[0]?.message?.content || this.getFallback(lang);

    // Truncado inteligente
    if (text.length > 450) {
      const truncated = text.slice(0, 450);
      const lastDot = truncated.lastIndexOf('.');
      if (lastDot > 200) {
        text = truncated.slice(0, lastDot + 1);
      } else {
        text = truncated.slice(0, 447) + '...';
      }
    }

    // Actualizar memoria
    this.memory.updateMemory(username, question.slice(0, 50));

    return {
      response: text,
      debug: {
        userPrompt,
        systemPrompt,
        braveResults: searchResults,
      },
    };
  }

  /**
   * Obtiene un dato curioso aleatorio
   */
  getQuickFact(lang: SupportedLanguage = 'es'): string {
    const facts = this.literales.facts[lang] || this.literales.facts.es;
    return facts[Math.floor(Math.random() * facts.length)];
  }

  /**
   * Obtiene un piropo aleatorio
   */
  getRandomPiropo(lang: SupportedLanguage = 'es'): string {
    const piropos = this.literales.piropos[lang] || this.literales.piropos.es;
    return piropos[Math.floor(Math.random() * piropos.length)];
  }

  /**
   * Obtiene un mensaje del bot en el idioma del usuario
   */
  getMessage(key: string, lang: SupportedLanguage = 'es', replacements: Record<string, string | number> = {}): string {
    let text = this.literales.mensajes_bot[lang]?.[key] || this.literales.mensajes_bot['es'][key] || key;

    for (const [k, v] of Object.entries(replacements)) {
      text = text.replace(`{${k}}`, String(v));
    }
    return text;
  }

  /**
   * Obtiene el fallback de IA
   */
  getFallback(lang: SupportedLanguage = 'es'): string {
    return this.literales.fallback_ia[lang] || this.literales.fallback_ia.es;
  }

  private extractDomain(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace(/^www\./, '').split('.')[0];
    } catch {
      return 'Web';
    }
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

export default AIService;
