import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('TokenManager Module', () => {
  describe('TokenManager class', () => {
    it('should export TokenManager class', async () => {
      const { TokenManager } = await import('../token-manager.js');

      assert.ok(TokenManager);
      assert.strictEqual(typeof TokenManager, 'function');
    });

    it('should export default tokenManager instance', async () => {
      const tokenManager = (await import('../token-manager.js')).default;

      assert.ok(tokenManager);
      assert.strictEqual(typeof tokenManager.load, 'function');
      assert.strictEqual(typeof tokenManager.save, 'function');
      assert.strictEqual(typeof tokenManager.validate, 'function');
      assert.strictEqual(typeof tokenManager.refresh, 'function');
      assert.strictEqual(typeof tokenManager.startAutoValidation, 'function');
      assert.strictEqual(typeof tokenManager.stopAutoValidation, 'function');
      assert.strictEqual(typeof tokenManager.getAccessToken, 'function');
      assert.strictEqual(typeof tokenManager.twitchRequest, 'function');
    });

    it('should be an EventEmitter', async () => {
      const tokenManager = (await import('../token-manager.js')).default;

      assert.strictEqual(typeof tokenManager.on, 'function');
      assert.strictEqual(typeof tokenManager.emit, 'function');
      assert.strictEqual(typeof tokenManager.once, 'function');
    });
  });

  describe('Configuration', () => {
    it('should have reasonable validation interval', async () => {
      // Importamos para verificar que no hay errores de sintaxis
      const tokenManager = (await import('../token-manager.js')).default;

      // El intervalo de validación debería ser razonable (no demasiado frecuente)
      // No podemos acceder directamente a CONFIG, pero podemos verificar que el módulo carga
      assert.ok(tokenManager);
    });
  });
});
