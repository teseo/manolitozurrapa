import { describe, it, expect } from '@jest/globals';
import {
  detectLanguage,
  extractDomain,
  capitalizeFirst,
  cleanHtml,
  smartTruncate,
  parseClipCommand,
  getTierNumber,
  sleep,
} from '../../src/utils/helpers.js';

describe('detectLanguage', () => {
  it('should detect Spanish text', () => {
    expect(detectLanguage('hola que tal estas')).toBe('es');
    expect(detectLanguage('como puedo hacer esto')).toBe('es');
    expect(detectLanguage('illo quillo miarma')).toBe('es');
  });

  it('should detect English text', () => {
    expect(detectLanguage('hello how are you today')).toBe('en');
    expect(detectLanguage('what is the best way to do this')).toBe('en');
    expect(detectLanguage('please can you help me with this')).toBe('en');
  });

  it('should detect Afrikaans text', () => {
    expect(detectLanguage('boet hoe gaan dit met jou')).toBe('af');
    expect(detectLanguage('lekker tjom baie dankie')).toBe('af');
    expect(detectLanguage('eish swaer dit is nie goed nie')).toBe('af');
    expect(detectLanguage('ja-nee boet ek sal dit doen')).toBe('af');
  });

  it('should default to Spanish for ambiguous text', () => {
    expect(detectLanguage('test')).toBe('es');
    expect(detectLanguage('')).toBe('es');
  });

  it('should require at least 2 Afrikaans words to detect Afrikaans', () => {
    // Single Afrikaans word should not trigger Afrikaans detection
    expect(detectLanguage('boet')).toBe('es');
    // Two Afrikaans words should detect Afrikaans
    expect(detectLanguage('boet tjom')).toBe('af');
  });
});

describe('extractDomain', () => {
  it('should extract domain from URL', () => {
    expect(extractDomain('https://www.google.com/search')).toBe('google');
    expect(extractDomain('https://wikipedia.org/wiki/Test')).toBe('wikipedia');
    expect(extractDomain('https://api.example.com/v1')).toBe('api');
  });

  it('should return "Web" for invalid URLs', () => {
    expect(extractDomain('not a url')).toBe('Web');
    expect(extractDomain('')).toBe('Web');
  });
});

describe('capitalizeFirst', () => {
  it('should capitalize first letter', () => {
    expect(capitalizeFirst('hello')).toBe('Hello');
    expect(capitalizeFirst('world')).toBe('World');
  });

  it('should handle empty string', () => {
    expect(capitalizeFirst('')).toBe('');
  });

  it('should handle already capitalized string', () => {
    expect(capitalizeFirst('Hello')).toBe('Hello');
  });
});

describe('cleanHtml', () => {
  it('should clean HTML entities', () => {
    expect(cleanHtml('&amp;')).toBe('&');
    // Note: cleanHtml also removes HTML tags, so <div> becomes empty
    expect(cleanHtml('&lt;')).toBe('<');
    expect(cleanHtml('&gt;')).toBe('>');
    expect(cleanHtml('&quot;hello&quot;')).toBe('"hello"');
    expect(cleanHtml("it&#39;s")).toBe("it's");
    expect(cleanHtml('hello&nbsp;world')).toBe('hello world');
  });

  it('should remove HTML tags', () => {
    expect(cleanHtml('<p>hello</p>')).toBe('hello');
    expect(cleanHtml('<div class="test">content</div>')).toBe('content');
  });
});

describe('smartTruncate', () => {
  it('should not truncate short text', () => {
    const text = 'Short text.';
    expect(smartTruncate(text, 100)).toBe(text);
  });

  it('should truncate at last period if possible', () => {
    const text = 'First sentence. Second sentence. Third sentence is very long.';
    const result = smartTruncate(text, 40, 10);
    expect(result).toBe('First sentence. Second sentence.');
  });

  it('should add ellipsis if no period found after minLength', () => {
    const text = 'This is a very long sentence without periods that goes on and on';
    const result = smartTruncate(text, 30, 25);
    expect(result.endsWith('...')).toBe(true);
  });
});

describe('parseClipCommand', () => {
  const defaults = { defaultDuration: 90, minDuration: 15, maxDuration: 90 };

  it('should return defaults for empty args', () => {
    const result = parseClipCommand([], defaults.defaultDuration, defaults.minDuration, defaults.maxDuration);
    expect(result).toEqual({ duration: 90, title: null });
  });

  it('should parse duration and title', () => {
    const result = parseClipCommand(['30', 'Epic', 'moment'], defaults.defaultDuration, defaults.minDuration, defaults.maxDuration);
    expect(result).toEqual({ duration: 30, title: 'Epic moment' });
  });

  it('should parse only title', () => {
    const result = parseClipCommand(['Epic', 'moment'], defaults.defaultDuration, defaults.minDuration, defaults.maxDuration);
    expect(result).toEqual({ duration: 90, title: 'Epic moment' });
  });

  it('should clamp duration to min/max', () => {
    const resultMin = parseClipCommand(['5'], defaults.defaultDuration, defaults.minDuration, defaults.maxDuration);
    expect(resultMin.duration).toBe(15);

    const resultMax = parseClipCommand(['200'], defaults.defaultDuration, defaults.minDuration, defaults.maxDuration);
    expect(resultMax.duration).toBe(90);
  });
});

describe('getTierNumber', () => {
  it('should return correct tier numbers', () => {
    expect(getTierNumber('T1')).toBe(1);
    expect(getTierNumber('T2')).toBe(2);
    expect(getTierNumber('T3')).toBe(3);
  });

  it('should return 0 for unknown tiers', () => {
    expect(getTierNumber('unknown')).toBe(0);
    expect(getTierNumber('')).toBe(0);
  });
});

describe('sleep', () => {
  it('should wait for specified time', async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(45);
    expect(elapsed).toBeLessThan(100);
  });
});
