import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DiscordService } from '../../src/services/discord.js';

describe('DiscordService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('constructor', () => {
    it('should create instance with webhook URL', () => {
      const service = new DiscordService({ webhookUrl: 'https://discord.com/webhook' });
      expect(service.hasWebhook()).toBe(true);
    });

    it('should create instance without webhook URL', () => {
      const service = new DiscordService({ webhookUrl: '' });
      expect(service.hasWebhook()).toBe(false);
    });
  });

  describe('hasWebhook', () => {
    it('should return true when webhook is set', () => {
      const service = new DiscordService({ webhookUrl: 'https://discord.com/webhook' });
      expect(service.hasWebhook()).toBe(true);
    });

    it('should return false when webhook is empty', () => {
      const service = new DiscordService({ webhookUrl: '' });
      expect(service.hasWebhook()).toBe(false);
    });
  });

  describe('sendEmergencyNotification', () => {
    it('should not throw when no webhook configured', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const service = new DiscordService({ webhookUrl: '' });
      await service.sendEmergencyNotification('Test message');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No hay webhook'));
      consoleSpy.mockRestore();
    });

    it('should send message to webhook', async () => {
      const mockFetch = jest.fn<typeof fetch>().mockResolvedValue({
        ok: true,
      } as Response);
      global.fetch = mockFetch;

      const service = new DiscordService({ webhookUrl: 'https://discord.com/webhook' });
      await service.sendEmergencyNotification('Emergency!');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://discord.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Emergency!'),
        })
      );
    });
  });

  describe('sendClip', () => {
    it('should throw error when no webhook configured', async () => {
      const service = new DiscordService({ webhookUrl: '' });
      await expect(
        service.sendClip({
          url: 'https://clips.twitch.tv/test',
          title: 'Test',
          creator: 'user',
          duration: 30,
        })
      ).rejects.toThrow('No Discord webhook configured');
    });

    it('should send clip data to webhook', async () => {
      const mockFetch = jest.fn<typeof fetch>().mockResolvedValue({
        ok: true,
      } as Response);
      global.fetch = mockFetch;

      const service = new DiscordService({ webhookUrl: 'https://discord.com/webhook' });
      const result = await service.sendClip({
        url: 'https://clips.twitch.tv/test',
        title: 'Epic Moment',
        creator: 'testuser',
        duration: 30,
      });

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://discord.com/webhook',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Epic Moment'),
        })
      );
    });

    it('should throw error on webhook failure', async () => {
      global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request'),
      } as Response);

      const service = new DiscordService({ webhookUrl: 'https://discord.com/webhook' });
      await expect(
        service.sendClip({
          url: 'https://clips.twitch.tv/test',
          title: 'Test',
          creator: 'user',
          duration: 30,
        })
      ).rejects.toThrow('Discord webhook error: 400 - Bad Request');
    });
  });
});
