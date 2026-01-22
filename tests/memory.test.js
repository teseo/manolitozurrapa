import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

// Mock fs antes de importar memory.js
import fs from 'node:fs';

describe('Memory Module', () => {
  describe('detectRole', () => {
    it('should detect reina role', async () => {
      // Import dinámico para evitar efectos secundarios
      const { detectRole } = await import('../memory.js');

      const role = detectRole('mariajosobrasada');
      assert.strictEqual(role, 'REINA 👸');
    });

    it('should detect MOD role', async () => {
      const { detectRole } = await import('../memory.js');

      const role = detectRole('donzeyt');
      assert.strictEqual(role, 'MOD 🛡️');
    });

    it('should detect VIP role', async () => {
      const { detectRole } = await import('../memory.js');

      const role = detectRole('cletosat');
      assert.strictEqual(role, 'VIP 👑');
    });

    it('should detect BOT role', async () => {
      const { detectRole } = await import('../memory.js');

      const role = detectRole('streamelements');
      assert.strictEqual(role, 'BOT 🤖');
    });

    it('should return viewer for unknown users', async () => {
      const { detectRole } = await import('../memory.js');

      const role = detectRole('random_user_123');
      assert.strictEqual(role, 'viewer');
    });

    it('should be case insensitive', async () => {
      const { detectRole } = await import('../memory.js');

      const role = detectRole('MARIAJOSOBRASADA');
      assert.strictEqual(role, 'REINA 👸');
    });
  });

  describe('getEmote', () => {
    it('should return an emote for valid category', async () => {
      const { getEmote, EMOTES } = await import('../memory.js');

      const emote = getEmote('happy');
      assert.ok(EMOTES.happy.includes(emote));
    });

    it('should default to happy for invalid category', async () => {
      const { getEmote, EMOTES } = await import('../memory.js');

      const emote = getEmote('invalid_category');
      assert.ok(EMOTES.happy.includes(emote));
    });
  });

  describe('COMMUNITY structure', () => {
    it('should have required community groups', async () => {
      const { COMMUNITY } = await import('../memory.js');

      assert.ok(Array.isArray(COMMUNITY.reina));
      assert.ok(Array.isArray(COMMUNITY.mods));
      assert.ok(Array.isArray(COMMUNITY.vips));
      assert.ok(Array.isArray(COMMUNITY.subs));
      assert.ok(typeof COMMUNITY.gifters === 'object');
      assert.ok(Array.isArray(COMMUNITY.bots));
    });
  });

  describe('EMOTES structure', () => {
    it('should have required emote categories', async () => {
      const { EMOTES } = await import('../memory.js');

      assert.ok(Array.isArray(EMOTES.happy));
      assert.ok(Array.isArray(EMOTES.love));
      assert.ok(Array.isArray(EMOTES.clap));
      assert.ok(Array.isArray(EMOTES.sad));
      assert.ok(Array.isArray(EMOTES.funny));
      assert.ok(Array.isArray(EMOTES.rock));
    });
  });
});
