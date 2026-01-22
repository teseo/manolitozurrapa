import type { SearchResult } from '../types/index.js';
import { API_URLS } from '../config/constants.js';
import { cleanHtml } from '../utils/helpers.js';

interface SearchServiceConfig {
  apiKey: string;
  maxResults?: number;
}

export class SearchService {
  private apiKey: string;
  private maxResults: number;

  constructor(config: SearchServiceConfig) {
    this.apiKey = config.apiKey;
    this.maxResults = config.maxResults || 5;
  }

  /**
   * Verifica si hay API key configurada
   */
  hasApiKey(): boolean {
    return !!this.apiKey;
  }

  /**
   * Realiza una búsqueda en Brave Search
   */
  async search(query: string): Promise<SearchResult[]> {
    if (!this.apiKey) {
      throw new Error('No API key configured');
    }

    const url = new URL(API_URLS.braveSearch);
    url.searchParams.set('q', query);
    url.searchParams.set('count', String(this.maxResults));

    console.log(`🌐 BRAVE QUERY: "${query}"`);
    console.log(`🔗 BRAVE URL: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: {
        'X-Subscription-Token': this.apiKey,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Brave API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      web?: {
        results?: Array<{
          title?: string;
          url: string;
          description?: string;
        }>;
      };
    };

    // Log raw response de Brave
    console.log('');
    console.log('───────────────────────────────────────────────────────────');
    console.log('📥 RAW BRAVE API RESPONSE');
    console.log('───────────────────────────────────────────────────────────');
    console.log(JSON.stringify(data.web?.results || [], null, 2));
    console.log('───────────────────────────────────────────────────────────');

    if (!data.web?.results) {
      return [];
    }

    return data.web.results.map((result) => ({
      title: cleanHtml(result.title || ''),
      url: result.url,
      description: cleanHtml(result.description || ''),
    }));
  }
}

export default SearchService;
