import { describe, it, expect, beforeAll } from '@jest/globals';

describe('Environment Loading Order', () => {
  beforeAll(() => {
    // Simular variables de entorno antes de importar
    process.env.TWITCH_CLIENT_ID = 'test_client_id';
    process.env.TWITCH_CLIENT_SECRET = 'test_client_secret';
    process.env.TWITCH_CHANNEL = 'test_channel';
    process.env.TWITCH_BOT_USERNAME = 'test_bot';
  });

  it('should load environment variables into DEFAULT_CONFIG', async () => {
    // Importar después de setear las variables
    const { DEFAULT_CONFIG } = await import('../../src/config/constants.js');

    expect(DEFAULT_CONFIG.clientId).toBe('test_client_id');
    expect(DEFAULT_CONFIG.clientSecret).toBe('test_client_secret');
    expect(DEFAULT_CONFIG.channel).toBe('test_channel');
    expect(DEFAULT_CONFIG.botUsername).toBe('test_bot');
  });

  it('should import env.js before constants import in index.ts', async () => {
    const fs = await import('node:fs');
    const indexContent = fs.readFileSync('src/index.ts', 'utf-8');

    const envImportIndex = indexContent.indexOf("import './env.js'");
    const constantsImportIndex = indexContent.indexOf("from './config/constants.js'");

    expect(envImportIndex).toBeGreaterThan(-1);
    expect(constantsImportIndex).toBeGreaterThan(-1);
    expect(envImportIndex).toBeLessThan(constantsImportIndex);
  });

  it('should have env.ts that loads dotenv', async () => {
    const fs = await import('node:fs');
    const envContent = fs.readFileSync('src/env.ts', 'utf-8');

    expect(envContent).toContain("import dotenv from 'dotenv'");
    expect(envContent).toContain('dotenv.config()');
  });
});
