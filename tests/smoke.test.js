import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

describe('Smoke Tests', () => {
  describe('Module Loading', () => {
    it('should load memory.js without errors', async () => {
      const module = await import('../memory.js');
      assert.ok(module);
    });

    it('should load token-manager.js without errors', async () => {
      const module = await import('../token-manager.js');
      assert.ok(module);
    });

    it('should load manolito-ai.js without errors', async () => {
      const module = await import('../manolito-ai.js');
      assert.ok(module);
    });

    it('should load brave-search.js without errors', async () => {
      const module = await import('../brave-search.js');
      assert.ok(module);
    });

    it('should load discord-notify.js without errors', async () => {
      const module = await import('../discord-notify.js');
      assert.ok(module);
    });
  });

  describe('Required Files', () => {
    it('should have literales.json', () => {
      const filePath = path.join(rootDir, 'literales.json');
      assert.ok(fs.existsSync(filePath), 'literales.json should exist');
    });

    it('should have valid literales.json', () => {
      const filePath = path.join(rootDir, 'literales.json');
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content);

      assert.ok(parsed.system_prompt, 'should have system_prompt');
      assert.ok(parsed.facts, 'should have facts');
      assert.ok(Array.isArray(parsed.facts), 'facts should be array');
    });

    it('should have CONTEXTO.md', () => {
      const filePath = path.join(rootDir, 'CONTEXTO.md');
      assert.ok(fs.existsSync(filePath), 'CONTEXTO.md should exist');
    });

    it('should have .env.example', () => {
      const filePath = path.join(rootDir, '.env.example');
      assert.ok(fs.existsSync(filePath), '.env.example should exist');
    });

    it('should have data directory', () => {
      const dirPath = path.join(rootDir, 'data');
      assert.ok(fs.existsSync(dirPath), 'data/ directory should exist');
    });

    it('should have logs directory', () => {
      const dirPath = path.join(rootDir, 'logs');
      assert.ok(fs.existsSync(dirPath), 'logs/ directory should exist');
    });
  });

  describe('Package Configuration', () => {
    it('should have valid package.json', () => {
      const filePath = path.join(rootDir, 'package.json');
      const content = fs.readFileSync(filePath, 'utf8');
      const pkg = JSON.parse(content);

      assert.strictEqual(pkg.type, 'module', 'should use ES modules');
      assert.ok(pkg.scripts.start, 'should have start script');
      assert.ok(pkg.scripts.test, 'should have test script');
      assert.ok(pkg.engines?.node, 'should specify node engine');
    });
  });

  describe('Export Verification', () => {
    it('memory.js should export required functions', async () => {
      const module = await import('../memory.js');

      assert.strictEqual(typeof module.detectRole, 'function');
      assert.strictEqual(typeof module.getEmote, 'function');
      assert.strictEqual(typeof module.loadContext, 'function');
      assert.strictEqual(typeof module.getMemory, 'function');
      assert.strictEqual(typeof module.updateMemory, 'function');
    });

    it('discord-notify.js should export required functions', async () => {
      const module = await import('../discord-notify.js');

      assert.strictEqual(typeof module.hasWebhook, 'function');
      assert.strictEqual(typeof module.sendClipToDiscord, 'function');
      assert.strictEqual(typeof module.sendEmergencyNotification, 'function');
    });

    it('manolito-ai.js should export required functions', async () => {
      const module = await import('../manolito-ai.js');

      assert.strictEqual(typeof module.askManolito, 'function');
      assert.strictEqual(typeof module.askManolitoWithSearch, 'function');
      assert.strictEqual(typeof module.getQuickFact, 'function');
      assert.strictEqual(typeof module.getRandomPiropo, 'function');
    });

    it('brave-search.js should export required functions', async () => {
      const module = await import('../brave-search.js');

      assert.strictEqual(typeof module.search, 'function');
      assert.strictEqual(typeof module.hasApiKey, 'function');
    });
  });
});
