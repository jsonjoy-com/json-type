import {t} from '../../..';

describe('StringType format validation', () => {
  describe('ASCII format', () => {
    const asciiType = t.String({format: 'ascii'});

    test('accepts valid ASCII strings', () => {
      const validator = asciiType.validator('boolean');
      expect(validator('hello world')).toBe(false);
      expect(validator('123')).toBe(false);
      expect(validator('!@#$%^&*()')).toBe(false);
      expect(validator('')).toBe(false);
      expect(validator('A')).toBe(false);
      expect(validator(' ')).toBe(false);
    });

    test('rejects non-ASCII strings', () => {
      const validator = asciiType.validator('boolean');
      expect(validator('héllo')).toBe(true); // é is not ASCII
      expect(validator('🚀')).toBe(true); // Emoji
      expect(validator('中文')).toBe(true); // Chinese characters
      expect(validator('русский')).toBe(true); // Cyrillic
    });

    test('works with min/max length', () => {
      const type = t.String({format: 'ascii', min: 2, max: 5});
      const validator = type.validator('boolean');
      
      expect(validator('ab')).toBe(false); // Valid ASCII, correct length
      expect(validator('abcde')).toBe(false); // Valid ASCII, correct length
      expect(validator('a')).toBe(true); // Too short
      expect(validator('abcdef')).toBe(true); // Too long
      expect(validator('ñ')).toBe(true); // Non-ASCII (but would also be too short)
      expect(validator('ñoño')).toBe(true); // Good length, but not ASCII
    });
  });

  describe('UTF-8 format', () => {
    const utf8Type = t.String({format: 'utf8'});

    test('accepts valid UTF-8 strings', () => {
      const validator = utf8Type.validator('boolean');
      expect(validator('hello world')).toBe(false);
      expect(validator('héllo')).toBe(false);
      expect(validator('🚀')).toBe(false);
      expect(validator('中文')).toBe(false);
      expect(validator('русский')).toBe(false);
      expect(validator('')).toBe(false);
    });

    test('rejects strings with unpaired surrogates', () => {
      const validator = utf8Type.validator('boolean');
      // Create strings with unpaired surrogates
      const highSurrogate = String.fromCharCode(0xD800); // High surrogate without low
      const lowSurrogate = String.fromCharCode(0xDC00); // Low surrogate without high
      
      expect(validator(highSurrogate)).toBe(true); // Unpaired high surrogate
      expect(validator(lowSurrogate)).toBe(true); // Orphaned low surrogate
      expect(validator('hello' + highSurrogate)).toBe(true); // High surrogate at end
      expect(validator(highSurrogate + lowSurrogate + highSurrogate)).toBe(true); // Unpaired at end
    });

    test('accepts valid surrogate pairs', () => {
      const validator = utf8Type.validator('boolean');
      // Valid emoji with surrogate pairs
      expect(validator('👍')).toBe(false); // Valid surrogate pair
      expect(validator('💖')).toBe(false); // Valid surrogate pair
    });
  });

  describe('Backward compatibility with ascii boolean', () => {
    test('ascii: true behaves like format: "ascii"', () => {
      const asciiType = t.String({ascii: true});
      const validator = asciiType.validator('boolean');
      
      expect(validator('hello')).toBe(false); // Valid ASCII
      expect(validator('héllo')).toBe(true); // Non-ASCII
    });

    test('format takes precedence over ascii boolean', () => {
      const type = t.String({format: 'utf8', ascii: true});
      const validator = type.validator('boolean');
      
      // Should behave as UTF-8 validation, allowing non-ASCII
      expect(validator('héllo')).toBe(false); // Should pass UTF-8 validation
    });
  });

  describe('Schema validation', () => {
    test('validates format values', () => {
      expect(() => t.String({format: 'ascii'}).validateSchema()).not.toThrow();
      expect(() => t.String({format: 'utf8'}).validateSchema()).not.toThrow();
      expect(() => t.String({format: 'invalid' as any}).validateSchema()).toThrow('INVALID_STRING_FORMAT');
    });

    test('validates format and ascii consistency', () => {
      expect(() => t.String({format: 'ascii', ascii: false}).validateSchema()).toThrow('FORMAT_ASCII_MISMATCH');
      expect(() => t.String({format: 'ascii', ascii: true}).validateSchema()).not.toThrow();
      expect(() => t.String({format: 'utf8', ascii: true}).validateSchema()).not.toThrow(); // UTF-8 can have ascii=true
    });
  });

  describe('JSON Schema export', () => {
    test('ASCII format adds pattern', () => {
      const type = t.String({format: 'ascii'});
      const jsonSchema = type.toJsonSchema();
      expect(jsonSchema.pattern).toBe('^[\\x00-\\x7F]*$');
    });

    test('UTF-8 format does not add pattern', () => {
      const type = t.String({format: 'utf8'});
      const jsonSchema = type.toJsonSchema();
      expect(jsonSchema.pattern).toBeUndefined();
    });

    test('backward compatibility with ascii boolean', () => {
      const type = t.String({ascii: true});
      const jsonSchema = type.toJsonSchema();
      expect(jsonSchema.pattern).toBe('^[\\x00-\\x7F]*$');
    });
  });
});