import { jest, describe, it, expect } from '@jest/globals';
import { SearchService } from '../../src/services/search.js';

describe('SearchService', () => {
  describe('constructor', () => {
    it('should create instance with API key', () => {
      const service = new SearchService({ apiKey: 'test-key' });
      expect(service.hasApiKey()).toBe(true);
    });

    it('should create instance without API key', () => {
      const service = new SearchService({ apiKey: '' });
      expect(service.hasApiKey()).toBe(false);
    });
  });

  describe('hasApiKey', () => {
    it('should return true when API key is set', () => {
      const service = new SearchService({ apiKey: 'valid-key' });
      expect(service.hasApiKey()).toBe(true);
    });

    it('should return false when API key is empty', () => {
      const service = new SearchService({ apiKey: '' });
      expect(service.hasApiKey()).toBe(false);
    });
  });

  describe('search', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should throw error when no API key configured', async () => {
      const service = new SearchService({ apiKey: '' });
      await expect(service.search('test query')).rejects.toThrow('No API key configured');
    });

    it('should make request with correct parameters', async () => {
      const mockFetch = jest.fn<typeof fetch>().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ web: { results: [] } }),
      } as Response);
      global.fetch = mockFetch;

      const service = new SearchService({ apiKey: 'test-key', maxResults: 5 });
      await service.search('test query');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q=test+query'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Subscription-Token': 'test-key',
          }),
        })
      );
    });

    it('should return empty array when no results', async () => {
      global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ web: null }),
      } as Response);

      const service = new SearchService({ apiKey: 'test-key' });
      const results = await service.search('test');
      expect(results).toEqual([]);
    });

    it('should parse and return results correctly', async () => {
      global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            web: {
              results: [
                { title: 'Test Title', url: 'https://example.com', description: 'Test desc' },
              ],
            },
          }),
      } as Response);

      const service = new SearchService({ apiKey: 'test-key' });
      const results = await service.search('test');

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        title: 'Test Title',
        url: 'https://example.com',
        description: 'Test desc',
      });
    });

    it('should throw error on API failure', async () => {
      global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const service = new SearchService({ apiKey: 'test-key' });
      await expect(service.search('test')).rejects.toThrow('Brave API error: 500');
    });
  });
});
