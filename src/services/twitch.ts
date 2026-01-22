import type { TokenManager } from '../managers/token.js';
import { API_URLS } from '../config/constants.js';

interface TwitchClip {
  id: string;
  edit_url?: string;
}

export class TwitchService {
  private tokenManager: TokenManager;
  private broadcasterIdCache: string | null = null;

  constructor(tokenManager: TokenManager) {
    this.tokenManager = tokenManager;
  }

  /**
   * Obtiene el broadcaster ID de un canal
   */
  async getBroadcasterId(channelName: string): Promise<string> {
    if (this.broadcasterIdCache) {
      return this.broadcasterIdCache;
    }

    const response = await this.tokenManager.twitchRequest(
      `${API_URLS.twitchUsers}?login=${channelName}`
    );

    if (!response.ok) {
      throw new Error(`Error al obtener broadcaster_id: ${response.status}`);
    }

    const data = (await response.json()) as { data: Array<{ id: string }> };
    if (!data.data || data.data.length === 0) {
      throw new Error(`Canal "${channelName}" no encontrado`);
    }

    this.broadcasterIdCache = data.data[0].id;
    console.log(`Broadcaster ID de ${channelName}: ${this.broadcasterIdCache}`);

    return this.broadcasterIdCache;
  }

  /**
   * Crea un clip
   */
  async createClip(broadcasterId: string, _duration?: number, _title?: string): Promise<TwitchClip> {
    const url = new URL(API_URLS.twitchClips);
    url.searchParams.set('broadcaster_id', broadcasterId);
    url.searchParams.set('has_delay', 'false');

    const response = await this.tokenManager.twitchRequest(url.toString(), {
      method: 'POST',
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as { message?: string };
      throw new Error(error.message || `Error ${response.status} al crear clip`);
    }

    const data = (await response.json()) as { data: TwitchClip[] };
    if (!data.data || data.data.length === 0) {
      throw new Error('No se recibió información del clip');
    }

    return data.data[0];
  }

  /**
   * Obtiene la URL del clip
   */
  getClipUrl(clipId: string): string {
    return `https://clips.twitch.tv/${clipId}`;
  }

  /**
   * Limpia la cache del broadcaster ID
   */
  clearCache(): void {
    this.broadcasterIdCache = null;
  }
}

export default TwitchService;
