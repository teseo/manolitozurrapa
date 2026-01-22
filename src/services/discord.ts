import type { ClipData } from '../types/index.js';
import type { MemoryManager } from '../managers/memory.js';

interface DiscordServiceConfig {
  webhookUrl: string;
}

export class DiscordService {
  private webhookUrl: string;

  constructor(config: DiscordServiceConfig) {
    this.webhookUrl = config.webhookUrl;
  }

  /**
   * Establece el MemoryManager (mantenido por compatibilidad)
   */
  setMemoryManager(_memory: MemoryManager): void {
    // No-op: ya no se usa para notificaciones de clips
  }

  /**
   * Verifica si hay webhook configurado
   */
  hasWebhook(): boolean {
    return !!this.webhookUrl;
  }

  /**
   * Envía una notificación de emergencia
   */
  async sendEmergencyNotification(message: string): Promise<void> {
    if (!this.webhookUrl) {
      console.error('⚠️ No hay webhook para notificación de emergencia');
      return;
    }

    const payload = {
      username: 'ManolitoZurrapa',
      embeds: [{
        title: '⚠️ ALERTA',
        description: message,
        color: 0xFF0000,
        timestamp: new Date().toISOString(),
        footer: { text: 'ManolitoZurrapa Bot' }
      }]
    };

    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      console.log('🚨 Notificación de emergencia enviada a Discord');
    } catch (err) {
      console.error('❌ Error enviando notificación de emergencia:', (err as Error).message);
    }
  }

  /**
   * Envía un clip a Discord
   */
  async sendClip(clipData: ClipData): Promise<boolean> {
    if (!this.webhookUrl) {
      throw new Error('No Discord webhook configured');
    }

    const { url } = clipData;

    const payload = {
      username: 'ManolitoZurrapa',
      content: `🎬 Un clip nuevo para las personas\n\n${url}`,
    };

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Discord webhook error: ${response.status} - ${error}`);
    }

    return true;
  }
}

export default DiscordService;
