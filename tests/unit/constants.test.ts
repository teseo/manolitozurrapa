import { describe, it, expect } from '@jest/globals';
import { INTERVALS, TIER_LIMITS, RETRY_CONFIG, CHAR_LIMITS, API_URLS, AI_PROVIDERS, AI_DEFAULTS } from '../../src/config/constants.js';

describe('INTERVALS', () => {
  it('should have correct token validation interval', () => {
    expect(INTERVALS.tokenValidation).toBe(30 * 60 * 1000); // 30 minutes
  });

  it('should have correct token refresh before interval', () => {
    expect(INTERVALS.tokenRefreshBefore).toBe(60 * 60 * 1000); // 1 hour
  });

  it('should have correct piropo timer', () => {
    expect(INTERVALS.piropoTimer).toBe(15 * 60 * 1000); // 15 minutes
  });

  it('should have correct memory cleanup interval', () => {
    expect(INTERVALS.memoryCleanup).toBe(30 * 60 * 1000); // 30 minutes
  });

  it('should have correct cooldowns', () => {
    expect(INTERVALS.searchCooldown).toBe(5000); // 5 seconds
    expect(INTERVALS.manolitoCooldown).toBe(3000); // 3 seconds
  });
});

describe('TIER_LIMITS', () => {
  describe('messages', () => {
    it('should have infinity for privileged tiers', () => {
      expect(TIER_LIMITS.messages.reina).toBe(Infinity);
      expect(TIER_LIMITS.messages.broadcaster).toBe(Infinity);
      expect(TIER_LIMITS.messages.mod).toBe(Infinity);
      expect(TIER_LIMITS.messages.vip).toBe(Infinity);
      expect(TIER_LIMITS.messages.T3).toBe(Infinity);
    });

    it('should have correct limits for lower tiers', () => {
      expect(TIER_LIMITS.messages.T2).toBe(60);
      expect(TIER_LIMITS.messages.T1).toBe(30);
      expect(TIER_LIMITS.messages.none).toBe(0);
    });
  });

  describe('searches', () => {
    it('should have infinity for broadcaster', () => {
      expect(TIER_LIMITS.searches.broadcaster).toBe(Infinity);
    });

    it('should have 150 limit for privileged tiers', () => {
      expect(TIER_LIMITS.searches.reina).toBe(150);
      expect(TIER_LIMITS.searches.mod).toBe(150);
      expect(TIER_LIMITS.searches.vip).toBe(150);
      expect(TIER_LIMITS.searches.T3).toBe(150);
    });

    it('should have correct limits for lower tiers', () => {
      expect(TIER_LIMITS.searches.T2).toBe(10);
      expect(TIER_LIMITS.searches.T1).toBe(0);
      expect(TIER_LIMITS.searches.none).toBe(0);
    });
  });
});

describe('RETRY_CONFIG', () => {
  it('should have correct retry values', () => {
    expect(RETRY_CONFIG.maxRetries).toBe(3);
    expect(RETRY_CONFIG.retryDelayMs).toBe(5000);
  });
});

describe('CHAR_LIMITS', () => {
  it('should have correct character limits', () => {
    expect(CHAR_LIMITS.response).toBe(400);
    expect(CHAR_LIMITS.maxResponse).toBe(450);
    expect(CHAR_LIMITS.topic).toBe(50);
  });
});

describe('API_URLS', () => {
  it('should have correct Twitch URLs', () => {
    expect(API_URLS.twitchToken).toBe('https://id.twitch.tv/oauth2/token');
    expect(API_URLS.twitchValidate).toBe('https://id.twitch.tv/oauth2/validate');
    expect(API_URLS.twitchHelix).toBe('https://api.twitch.tv/helix');
    expect(API_URLS.twitchUsers).toBe('https://api.twitch.tv/helix/users');
    expect(API_URLS.twitchClips).toBe('https://api.twitch.tv/helix/clips');
  });

  it('should have correct Brave Search URL', () => {
    expect(API_URLS.braveSearch).toBe('https://api.search.brave.com/res/v1/web/search');
  });
});

describe('AI_PROVIDERS', () => {
  it('should have deepseek provider configured', () => {
    expect(AI_PROVIDERS.deepseek).toBeDefined();
    expect(AI_PROVIDERS.deepseek.baseURL).toBe('https://api.deepseek.com');
    expect(AI_PROVIDERS.deepseek.defaultModel).toBe('deepseek-chat');
  });

  it('should have groq provider configured', () => {
    expect(AI_PROVIDERS.groq).toBeDefined();
    expect(AI_PROVIDERS.groq.baseURL).toBe('https://api.groq.com/openai/v1');
    expect(AI_PROVIDERS.groq.defaultModel).toBe('llama-3.3-70b-versatile');
  });

  it('should have openai provider configured', () => {
    expect(AI_PROVIDERS.openai).toBeDefined();
    expect(AI_PROVIDERS.openai.baseURL).toBe('https://api.openai.com/v1');
    expect(AI_PROVIDERS.openai.defaultModel).toBe('gpt-4o-mini');
  });

  it('should have openrouter provider configured', () => {
    expect(AI_PROVIDERS.openrouter).toBeDefined();
    expect(AI_PROVIDERS.openrouter.baseURL).toBe('https://openrouter.ai/api/v1');
    expect(AI_PROVIDERS.openrouter.defaultModel).toBe('meta-llama/llama-3.3-70b-instruct');
  });

  it('should have all providers with required properties', () => {
    const providers = Object.keys(AI_PROVIDERS);
    expect(providers.length).toBeGreaterThanOrEqual(4);

    for (const provider of providers) {
      const config = AI_PROVIDERS[provider as keyof typeof AI_PROVIDERS];
      expect(config.baseURL).toBeDefined();
      expect(config.baseURL).toMatch(/^https:\/\//);
      expect(config.defaultModel).toBeDefined();
      expect(config.defaultModel.length).toBeGreaterThan(0);
    }
  });
});

describe('AI_DEFAULTS', () => {
  it('should have deepseek as default provider', () => {
    expect(AI_DEFAULTS.provider).toBe('deepseek');
  });

  it('should have correct default maxTokens', () => {
    expect(AI_DEFAULTS.maxTokens).toBe(200);
  });

  it('should have correct default temperature for conversation', () => {
    expect(AI_DEFAULTS.temperature).toBe(1.3);
  });

  it('should have default provider that exists in AI_PROVIDERS', () => {
    expect(AI_PROVIDERS[AI_DEFAULTS.provider as keyof typeof AI_PROVIDERS]).toBeDefined();
  });
});
