/**
 * Detecta el idioma de un texto (es, en, af)
 */
export function detectLanguage(text: string): 'es' | 'en' | 'af' {
  const lower = text.toLowerCase();

  // Palabras comunes por idioma (ampliadas para mejor detección)
  const enWords = [
    // Artículos, pronombres, preposiciones
    'the', 'a', 'an', 'i', 'me', 'my', 'you', 'your', 'he', 'she', 'it', 'we', 'they', 'them', 'his', 'her', 'its', 'our', 'their',
    'in', 'on', 'at', 'to', 'of', 'and', 'or', 'but', 'from', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between',
    // Verbos comunes
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall',
    'can', 'get', 'got', 'make', 'made', 'go', 'going', 'went', 'come', 'came', 'take', 'took', 'see', 'saw', 'know', 'knew', 'think', 'thought',
    'want', 'need', 'like', 'find', 'give', 'tell', 'say', 'said', 'ask', 'use', 'work', 'try', 'call', 'keep', 'let', 'begin', 'show', 'hear', 'play', 'run', 'move',
    // Preguntas
    'what', 'how', 'why', 'when', 'where', 'who', 'which', 'whose',
    // Adjetivos/adverbios comunes
    'good', 'bad', 'best', 'worst', 'new', 'old', 'first', 'last', 'long', 'great', 'little', 'own', 'other', 'right', 'big', 'small', 'large',
    'top', 'high', 'low', 'next', 'early', 'young', 'important', 'few', 'public', 'same', 'able',
    'just', 'also', 'now', 'very', 'even', 'back', 'any', 'only', 'well', 'then', 'more', 'here', 'much', 'still', 'always', 'never', 'really', 'most', 'already',
    // Sustantivos comunes
    'time', 'year', 'people', 'way', 'day', 'man', 'woman', 'thing', 'world', 'life', 'hand', 'part', 'child', 'place', 'case', 'week', 'company', 'companies',
    'system', 'program', 'question', 'government', 'number', 'night', 'point', 'home', 'water', 'room', 'mother', 'area', 'money', 'story', 'fact', 'month', 'lot', 'study',
    // Saludos/expresiones
    'hello', 'hi', 'hey', 'please', 'thanks', 'thank', 'yes', 'no', 'ok', 'okay',
    // Brit/Aussie slang
    'mate', 'bloke', 'cheers', 'innit', 'bloody', 'brilliant', 'lovely', 'proper', 'reckon'
  ];

  const esWords = [
    // Artículos, pronombres, preposiciones
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'yo', 'tu', 'tú', 'él', 'ella', 'nosotros', 'ellos', 'ellas', 'mi', 'mis', 'su', 'sus',
    'de', 'en', 'con', 'sin', 'sobre', 'entre', 'hacia', 'desde', 'hasta', 'según', 'durante', 'mediante',
    // Verbos comunes
    'es', 'son', 'está', 'están', 'ser', 'estar', 'hay', 'tiene', 'tienen', 'tengo', 'tienes', 'hacer', 'hago', 'hace', 'hacen', 'ir', 'voy', 'va', 'van',
    'puede', 'puedo', 'puedes', 'pueden', 'quiero', 'quiere', 'quieres', 'saber', 'sé', 'sabe', 'conocer', 'conozco', 'conoce', 'decir', 'digo', 'dice',
    'ver', 'veo', 've', 'dar', 'doy', 'da', 'llegar', 'llego', 'llega', 'pasar', 'paso', 'pasa', 'deber', 'debe', 'creer', 'creo', 'cree',
    // Preguntas
    'que', 'qué', 'como', 'cómo', 'donde', 'dónde', 'cuando', 'cuándo', 'quien', 'quién', 'cual', 'cuál', 'cuanto', 'cuánto', 'cuantos', 'cuántos',
    // Adjetivos/adverbios
    'bueno', 'buena', 'malo', 'mala', 'mejor', 'peor', 'grande', 'pequeño', 'nuevo', 'viejo', 'mucho', 'muchos', 'poco', 'pocos', 'todo', 'todos', 'toda', 'todas',
    'muy', 'más', 'menos', 'bien', 'mal', 'también', 'ahora', 'después', 'antes', 'siempre', 'nunca', 'aquí', 'allí', 'solo', 'ya', 'todavía', 'aún',
    // Sustantivos comunes
    'tiempo', 'año', 'día', 'vez', 'parte', 'mundo', 'vida', 'casa', 'hombre', 'mujer', 'país', 'lugar', 'cosa', 'caso', 'forma', 'gobierno', 'trabajo',
    // Saludos/expresiones
    'hola', 'gracias', 'esto', 'eso', 'sí', 'no', 'bueno', 'vale', 'pues', 'claro', 'venga',
    // Andaluz
    'illo', 'quillo', 'miarma', 'ozú', 'aro', 'cusha'
  ];

  const afWords = [
    // Pronombres, artículos
    'ek', 'jy', 'hy', 'sy', 'ons', 'hulle', 'my', 'jou', 'sy', 'ons', 'hul', 'hierdie', 'daardie', 'dit',
    // Preposiciones
    'in', 'op', 'met', 'vir', 'van', 'na', 'by', 'tot', 'uit', 'oor', 'onder', 'tussen', 'sonder',
    // Verbos
    'is', 'was', 'het', 'het', 'kan', 'sal', 'wil', 'moet', 'mag', 'gaan', 'kom', 'sien', 'weet', 'dink', 'maak', 'vat', 'gee', 'sê', 'vra', 'soek',
    // Preguntas
    'wat', 'hoe', 'waar', 'wanneer', 'wie', 'hoekom', 'waarom', 'watter',
    // Adjetivos/adverbios
    'goed', 'sleg', 'groot', 'klein', 'nuut', 'oud', 'baie', 'min', 'meer', 'minder', 'eerste', 'laaste', 'ander', 'self', 'alle', 'elke',
    'nie', 'ook', 'nou', 'dan', 'nog', 'al', 'net', 'hier', 'daar', 'altyd', 'nooit', 'reeds', 'soms',
    // Saludos/expresiones
    'hallo', 'dankie', 'asseblief', 'ja', 'nee',
    // SA slang
    'boet', 'tjom', 'lekker', 'eish', 'ja-nee', 'swaer', 'bra', 'kwaai', 'gatvol', 'bakgat', 'jislaaik', 'jissis', 'ag', 'shame', 'braai', 'biltong', 'dagga'
  ];

  let enScore = 0;
  let esScore = 0;
  let afScore = 0;

  const words = lower.split(/\s+/);
  for (const word of words) {
    if (enWords.includes(word)) enScore++;
    if (esWords.includes(word)) esScore++;
    if (afWords.includes(word)) afScore++;
  }

  // Afrikaans tiene prioridad si se detecta claramente
  if (afScore > esScore && afScore > enScore && afScore >= 2) return 'af';
  if (enScore > esScore && enScore >= 2) return 'en';
  return 'es';
}

/**
 * Extrae el dominio de una URL
 */
export function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '').split('.')[0];
  } catch {
    return 'Web';
  }
}

/**
 * Capitaliza la primera letra
 */
export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Limpia entidades HTML de un texto
 */
export function cleanHtml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, '');
}

/**
 * Trunca texto de forma inteligente (corta en el último punto si es posible)
 */
export function smartTruncate(text: string, maxLength: number, minLength: number = 200): string {
  if (text.length <= maxLength) return text;

  const truncated = text.slice(0, maxLength);
  const lastDot = truncated.lastIndexOf('.');

  if (lastDot > minLength) {
    return truncated.slice(0, lastDot + 1);
  }

  return truncated.slice(0, maxLength - 3) + '...';
}

/**
 * Parsea el comando de clip
 */
export function parseClipCommand(args: string[], defaultDuration: number, minDuration: number, maxDuration: number): { duration: number; title: string | null } {
  let duration = defaultDuration;
  let title: string | null = null;

  if (args.length === 0) {
    return { duration, title };
  }

  const firstArg = args[0];
  const maybeNumber = parseInt(firstArg, 10);

  if (!isNaN(maybeNumber) && maybeNumber.toString() === firstArg) {
    duration = Math.max(minDuration, Math.min(maxDuration, maybeNumber));
    if (args.length > 1) {
      title = args.slice(1).join(' ');
    }
  } else {
    title = args.join(' ');
  }

  return { duration, title };
}

/**
 * Convierte número de tier a nombre
 */
export function getTierNumber(tier: string): number {
  if (tier === 'T1') return 1;
  if (tier === 'T2') return 2;
  if (tier === 'T3') return 3;
  return 0;
}

/**
 * Espera un número de milisegundos
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
