import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { AI_PROVIDERS, AI_DEFAULTS } from '../../src/config/constants.js';

// Mock OpenAI before importing AIService
jest.unstable_mockModule('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  })),
}));

// Mock fs for literales.json
jest.unstable_mockModule('node:fs', () => ({
  default: {
    readFileSync: jest.fn().mockReturnValue(JSON.stringify({
      system_prompt: { es: 'Eres Manolito', en: 'You are Manolito', af: 'Jy is Manolito' },
      idiomas: { es: 'español', en: 'english', af: 'afrikaans' },
      mensajes_bot: { es: {}, en: {}, af: {} },
      fallback_ia: { es: 'Error illo', en: 'Error mate', af: 'Error boet' },
      piropos: { es: ['Qué guapa'], en: ['Looking good'], af: ['Lyk goed'] },
      facts: { es: ['Dato curioso'], en: ['Fun fact'], af: ['Interessante feit'] },
    })),
  },
}));

// Mock MemoryManager
const mockMemoryManager = {
  detectRole: jest.fn().mockReturnValue('viewer'),
  getMemory: jest.fn().mockReturnValue(null),
  getContext: jest.fn().mockReturnValue('Canal de música'),
  updateMemory: jest.fn(),
  getWatchStreak: jest.fn().mockReturnValue(null),
};

describe('AI Service Configuration', () => {
  describe('AI_PROVIDERS integration', () => {
    it('should have deepseek as a valid provider', () => {
      expect(AI_PROVIDERS.deepseek).toBeDefined();
      expect(AI_PROVIDERS.deepseek.baseURL).toContain('deepseek');
    });

    it('should have groq as a valid provider', () => {
      expect(AI_PROVIDERS.groq).toBeDefined();
      expect(AI_PROVIDERS.groq.baseURL).toContain('groq');
    });

    it('should have openai as a valid provider', () => {
      expect(AI_PROVIDERS.openai).toBeDefined();
      expect(AI_PROVIDERS.openai.baseURL).toContain('openai');
    });

    it('should have openrouter as a valid provider', () => {
      expect(AI_PROVIDERS.openrouter).toBeDefined();
      expect(AI_PROVIDERS.openrouter.baseURL).toContain('openrouter');
    });
  });

  describe('AI_DEFAULTS', () => {
    it('should use deepseek as default provider', () => {
      expect(AI_DEFAULTS.provider).toBe('deepseek');
    });

    it('should have temperature optimized for conversation (1.3)', () => {
      expect(AI_DEFAULTS.temperature).toBe(1.3);
    });

    it('should have reasonable maxTokens default', () => {
      expect(AI_DEFAULTS.maxTokens).toBe(200);
      expect(AI_DEFAULTS.maxTokens).toBeGreaterThan(0);
      expect(AI_DEFAULTS.maxTokens).toBeLessThanOrEqual(1000);
    });
  });

  describe('Provider URL validation', () => {
    it('all provider URLs should be HTTPS', () => {
      for (const [name, config] of Object.entries(AI_PROVIDERS)) {
        expect(config.baseURL).toMatch(/^https:\/\//);
      }
    });

    it('all providers should have non-empty default models', () => {
      for (const [name, config] of Object.entries(AI_PROVIDERS)) {
        expect(config.defaultModel).toBeDefined();
        expect(config.defaultModel.length).toBeGreaterThan(0);
      }
    });
  });
});

describe('AIService', () => {
  let AIService: any;
  let OpenAI: any;
  let mockCreate: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Get mocked OpenAI
    const openaiModule = await import('openai');
    OpenAI = openaiModule.default;

    // Setup mock for chat completions
    mockCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'Test response illo!' } }],
    });

    (OpenAI as jest.Mock).mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    }));

    // Import AIService after mocks are set up
    const aiModule = await import('../../src/services/ai.js');
    AIService = aiModule.AIService;
  });

  describe('constructor', () => {
    it('should create instance with default provider (deepseek)', () => {
      const service = new AIService({ apiKey: 'test-key' }, mockMemoryManager);

      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: 'test-key',
        baseURL: AI_PROVIDERS.deepseek.baseURL,
      });
    });

    it('should create instance with specified provider', () => {
      const service = new AIService({
        apiKey: 'test-key',
        provider: 'groq'
      }, mockMemoryManager);

      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: 'test-key',
        baseURL: AI_PROVIDERS.groq.baseURL,
      });
    });

    it('should fall back to deepseek for unknown provider', () => {
      const service = new AIService({
        apiKey: 'test-key',
        provider: 'unknown-provider'
      }, mockMemoryManager);

      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: 'test-key',
        baseURL: AI_PROVIDERS.deepseek.baseURL,
      });
    });

    it('should use custom model when provided', () => {
      const service = new AIService({
        apiKey: 'test-key',
        model: 'custom-model'
      }, mockMemoryManager);

      expect(service).toBeDefined();
    });

    it('should use custom temperature when provided', () => {
      const service = new AIService({
        apiKey: 'test-key',
        temperature: 1.5
      }, mockMemoryManager);

      expect(service).toBeDefined();
    });
  });

  describe('getQuickFact', () => {
    it('should return a fact in Spanish by default', () => {
      const service = new AIService({ apiKey: 'test-key' }, mockMemoryManager);
      const fact = service.getQuickFact();

      expect(fact).toBeDefined();
      expect(typeof fact).toBe('string');
    });

    it('should return a fact in the specified language', () => {
      const service = new AIService({ apiKey: 'test-key' }, mockMemoryManager);
      const factEn = service.getQuickFact('en');
      const factAf = service.getQuickFact('af');

      expect(factEn).toBeDefined();
      expect(factAf).toBeDefined();
    });
  });

  describe('getRandomPiropo', () => {
    it('should return a piropo in Spanish by default', () => {
      const service = new AIService({ apiKey: 'test-key' }, mockMemoryManager);
      const piropo = service.getRandomPiropo();

      expect(piropo).toBeDefined();
      expect(typeof piropo).toBe('string');
    });

    it('should return a piropo in the specified language', () => {
      const service = new AIService({ apiKey: 'test-key' }, mockMemoryManager);
      const piropoEn = service.getRandomPiropo('en');

      expect(piropoEn).toBeDefined();
    });
  });

  describe('getFallback', () => {
    it('should return fallback message in Spanish by default', () => {
      const service = new AIService({ apiKey: 'test-key' }, mockMemoryManager);
      const fallback = service.getFallback();

      expect(fallback).toBe('Error illo');
    });

    it('should return fallback message in specified language', () => {
      const service = new AIService({ apiKey: 'test-key' }, mockMemoryManager);

      expect(service.getFallback('en')).toBe('Error mate');
      expect(service.getFallback('af')).toBe('Error boet');
    });
  });

  describe('ask', () => {
    it('should call OpenAI API with correct parameters', async () => {
      const service = new AIService({ apiKey: 'test-key' }, mockMemoryManager);

      await service.ask('Hola Manolito', 'testuser', 'es');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: AI_PROVIDERS.deepseek.defaultModel,
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user' }),
          ]),
          max_tokens: 200,
          temperature: AI_DEFAULTS.temperature,
        })
      );
    });

    it('should return the AI response', async () => {
      const service = new AIService({ apiKey: 'test-key' }, mockMemoryManager);

      const response = await service.ask('Hola', 'testuser');

      expect(response).toBe('Test response illo!');
    });

    it('should update user memory after response', async () => {
      const service = new AIService({ apiKey: 'test-key' }, mockMemoryManager);

      await service.ask('Pregunta de prueba', 'testuser');

      expect(mockMemoryManager.updateMemory).toHaveBeenCalledWith(
        'testuser',
        expect.any(String)
      );
    });

    it('should truncate long responses', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'A'.repeat(500) } }],
      });

      const service = new AIService({ apiKey: 'test-key' }, mockMemoryManager);
      const response = await service.ask('test', 'user');

      expect(response.length).toBeLessThanOrEqual(400);
    });

    it('should return fallback on empty response', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      });

      const service = new AIService({ apiKey: 'test-key' }, mockMemoryManager);
      const response = await service.ask('test', 'user', 'es');

      expect(response).toBe('Error illo');
    });
  });

  describe('askWithSearch', () => {
    const mockSearchResults = [
      { title: 'Wikipedia', url: 'https://wikipedia.org', description: 'Test result' },
    ];

    it('should include search results in the prompt', async () => {
      const service = new AIService({ apiKey: 'test-key' }, mockMemoryManager);

      await service.askWithSearch('¿Qué es X?', mockSearchResults, 'testuser', {}, 'es');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Wikipedia')
            }),
          ]),
        })
      );
    });

    it('should return response with timing info', async () => {
      const service = new AIService({ apiKey: 'test-key' }, mockMemoryManager);
      const timings: { llm?: number } = {};

      const result = await service.askWithSearch('test', mockSearchResults, 'user', timings);

      expect(result.response).toBeDefined();
      expect(timings.llm).toBeDefined();
      expect(timings.llm).toBeGreaterThanOrEqual(0);
    });
  });
});
