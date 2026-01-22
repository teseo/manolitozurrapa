import { describe, it, expect } from '@jest/globals';

describe('Search mention regex', () => {
  // El mismo regex que usa index.ts
  const searchRegex = /^¿?\s*(?:me\s+|puedes\s+|podr[ií]as\s+|kan\s+jy\s+)?(busca(?:r(?:me)?|me|s)?|búsca(?:me|s)?|search(?:\s+for)?|encuentra|investiga|soek(?:\s+vir\s+my)?)(?:\s+(?:en\s+)?(?:internet|la\s+web|google|op\s+die\s+web))?\s+(.+?)[\?]?$/i;

  const testMatch = (input: string): string | null => {
    const match = input.match(searchRegex);
    return match ? match[2].trim() : null;
  };

  describe('Spanish direct commands', () => {
    it('should match "busca X"', () => {
      expect(testMatch('busca johnny clegg')).toBe('johnny clegg');
    });

    it('should match "buscame X"', () => {
      expect(testMatch('buscame johnny clegg')).toBe('johnny clegg');
    });

    it('should match "buscar X"', () => {
      expect(testMatch('buscar johnny clegg')).toBe('johnny clegg');
    });
  });

  describe('Spanish question forms', () => {
    it('should match "¿me buscas X?"', () => {
      expect(testMatch('¿me buscas johnny clegg?')).toBe('johnny clegg');
    });

    it('should match "me buscas X" without punctuation', () => {
      expect(testMatch('me buscas johnny clegg')).toBe('johnny clegg');
    });

    it('should match "¿puedes buscar X?"', () => {
      expect(testMatch('¿puedes buscar johnny clegg?')).toBe('johnny clegg');
    });

    it('should match "puedes buscarme X"', () => {
      expect(testMatch('puedes buscarme johnny clegg')).toBe('johnny clegg');
    });

    it('should match "podrías buscar X"', () => {
      expect(testMatch('podrías buscar johnny clegg')).toBe('johnny clegg');
    });

    it('should match "podrias buscarme X" without accent', () => {
      expect(testMatch('podrias buscarme johnny clegg')).toBe('johnny clegg');
    });
  });

  describe('With "en internet" variations', () => {
    it('should match "busca en internet X"', () => {
      expect(testMatch('busca en internet johnny clegg')).toBe('johnny clegg');
    });

    it('should match "¿me buscas en internet X?"', () => {
      expect(testMatch('¿me buscas en internet johnny clegg?')).toBe('johnny clegg');
    });

    it('should match "busca en la web X"', () => {
      expect(testMatch('busca en la web johnny clegg')).toBe('johnny clegg');
    });

    it('should match "busca en google X"', () => {
      expect(testMatch('busca en google johnny clegg')).toBe('johnny clegg');
    });
  });

  describe('English commands', () => {
    it('should match "search X"', () => {
      expect(testMatch('search johnny clegg')).toBe('johnny clegg');
    });

    it('should match "search for X"', () => {
      expect(testMatch('search for johnny clegg')).toBe('johnny clegg');
    });
  });

  describe('Alternative Spanish commands', () => {
    it('should match "encuentra X"', () => {
      expect(testMatch('encuentra johnny clegg')).toBe('johnny clegg');
    });

    it('should match "investiga X"', () => {
      expect(testMatch('investiga johnny clegg')).toBe('johnny clegg');
    });
  });

  describe('Afrikaans commands', () => {
    it('should match "soek X"', () => {
      expect(testMatch('soek johnny clegg')).toBe('johnny clegg');
    });

    it('should match "soek vir my X"', () => {
      expect(testMatch('soek vir my johnny clegg')).toBe('johnny clegg');
    });

    it('should match "kan jy soek X"', () => {
      expect(testMatch('kan jy soek johnny clegg')).toBe('johnny clegg');
    });

    it('should match "soek op die web X"', () => {
      expect(testMatch('soek op die web johnny clegg')).toBe('johnny clegg');
    });
  });

  describe('Complex queries', () => {
    it('should match long query with spaces', () => {
      expect(testMatch('¿me buscas en internet la relación entre johnny clegg y la música celta?'))
        .toBe('la relación entre johnny clegg y la música celta');
    });
  });

  describe('Should NOT match', () => {
    it('should not match random text', () => {
      expect(testMatch('hola como estas')).toBeNull();
    });

    it('should not match partial keywords', () => {
      expect(testMatch('buscando algo')).toBeNull();
    });
  });
});
