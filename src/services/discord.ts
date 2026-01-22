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

    const content = [
      `# ⚠️ ALERTA ManolitoZurrapa`,
      ``,
      `\`\`\``,
      message,
      `\`\`\``,
      ``,
      `-# ${new Date().toLocaleString('es-ES')}`,
    ].join('\n');

    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
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

    const { url, title, creator, duration } = clipData;

    // Detectar rol del creador
    const role = this.memory?.detectRole(creator) || 'viewer';
    const roleTag = role !== 'viewer' ? ` ${role}` : '';
    const gracias = this.getGracias(role, creator);

    // Mensaje con formato bonito + URL (Discord auto-embebe el player)
    const content = [
      `## 🎬 ${title || 'Nuevo clip'}`,
      ``,
      `> 👤 **${creator}**${roleTag}`,
      `> ⏱️ ${duration} segundos`,
      ``,
      gracias,
      ``,
      `-# ${url}`,
    ].join('\n');

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Discord webhook error: ${response.status} - ${error}`);
    }

    return true;
  }
}

export default DiscordService;
