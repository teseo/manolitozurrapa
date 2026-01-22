import type { ClipData, UserRole } from '../types/index.js';
import type { MemoryManager } from '../managers/memory.js';

interface DiscordServiceConfig {
  webhookUrl: string;
}

export class DiscordService {
  private webhookUrl: string;
  private memory: MemoryManager | null = null;

  constructor(config: DiscordServiceConfig) {
    this.webhookUrl = config.webhookUrl;
  }

  /**
   * Establece el MemoryManager para detectar roles
   */
  setMemoryManager(memory: MemoryManager): void {
    this.memory = memory;
  }

  /**
   * Verifica si hay webhook configurado
   */
  hasWebhook(): boolean {
    return !!this.webhookUrl;
  }

  /**
   * Obtiene mensaje de agradecimiento según rol
   */
  private getGracias(role: UserRole, creator: string): string {
    if (role.includes('REINA')) return `¡Gracias mi reina ${creator}! 👸💜`;
    if (role.includes('MOD')) return `¡Gracias por cuidar el canal, ${creator}! 🛡️`;
    if (role.includes('VIP')) return `¡Gracias crack, ${creator}! 👑`;
    if (role.includes('SUB')) return `¡Gracias por el apoyo, ${creator}! ⭐`;
    return `¡Gracias ${creator}! 💜`;
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
        color: 0xFF0000, // Rojo
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

    const { url, creator } = clipData;

    // URL en content para que Discord renderice el player nativo con play button
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
