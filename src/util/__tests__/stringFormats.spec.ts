import {isAscii, isValidUtf8, validateStringFormat} from '../stringFormats';

describe('String format validation utilities', () => {
  describe('isAscii', () => {
    test('returns true for ASCII strings', () => {
      expect(isAscii('')).toBe(true);
      expect(isAscii('hello')).toBe(true);
      expect(isAscii('Hello World!')).toBe(true);
      expect(isAscii('123456789')).toBe(true);
      expect(isAscii('!@#$%^&*()')).toBe(true);
      expect(isAscii(' \t\n\r')).toBe(true);
      expect(isAscii(String.fromCharCode(0))).toBe(true); // NULL character
      expect(isAscii(String.fromCharCode(127))).toBe(true); // DEL character
    });

    test('returns false for non-ASCII strings', () => {
      expect(isAscii('héllo')).toBe(false); // é = U+00E9 = 233
      expect(isAscii('café')).toBe(false); // é = U+00E9 = 233
      expect(isAscii('naïve')).toBe(false); // ï = U+00EF = 239
      expect(isAscii('🚀')).toBe(false); // Emoji
      expect(isAscii('中文')).toBe(false); // Chinese characters
      expect(isAscii('русский')).toBe(false); // Cyrillic
      expect(isAscii(String.fromCharCode(128))).toBe(false); // First non-ASCII
      expect(isAscii(String.fromCharCode(255))).toBe(false); // Latin-1 Supplement
    });

    test('handles edge cases', () => {
      expect(isAscii('hello' + String.fromCharCode(128))).toBe(false);
      expect(isAscii(String.fromCharCode(127) + 'hello')).toBe(true);
    });
  });

  describe('isValidUtf8', () => {
    test('returns true for valid UTF-8 strings', () => {
      expect(isValidUtf8('')).toBe(true);
      expect(isValidUtf8('hello')).toBe(true);
      expect(isValidUtf8('héllo')).toBe(true);
      expect(isValidUtf8('🚀')).toBe(true);
      expect(isValidUtf8('中文')).toBe(true);
      expect(isValidUtf8('русский')).toBe(true);
      expect(isValidUtf8('👍💖🎉')).toBe(true); // Multiple emojis with surrogate pairs
    });

    test('returns false for unpaired high surrogates', () => {
      const highSurrogate = String.fromCharCode(0xD800);
      expect(isValidUtf8(highSurrogate)).toBe(false);
      expect(isValidUtf8('hello' + highSurrogate)).toBe(false);
      expect(isValidUtf8(highSurrogate + 'world')).toBe(false);
    });

    test('returns false for orphaned low surrogates', () => {
      const lowSurrogate = String.fromCharCode(0xDC00);
      expect(isValidUtf8(lowSurrogate)).toBe(false);
      expect(isValidUtf8('hello' + lowSurrogate)).toBe(false);
      expect(isValidUtf8(lowSurrogate + 'world')).toBe(false);
    });

    test('returns false for high surrogate not followed by low surrogate', () => {
      const highSurrogate = String.fromCharCode(0xD800);
      const notLowSurrogate = String.fromCharCode(0xE000); // Outside surrogate range
      expect(isValidUtf8(highSurrogate + notLowSurrogate)).toBe(false);
      expect(isValidUtf8(highSurrogate + 'a')).toBe(false);
    });

    test('returns true for valid surrogate pairs', () => {
      // Create a valid surrogate pair manually
      const highSurrogate = String.fromCharCode(0xD800);
      const lowSurrogate = String.fromCharCode(0xDC00);
      expect(isValidUtf8(highSurrogate + lowSurrogate)).toBe(true);
      
      // Test with real emoji
      expect(isValidUtf8('👨‍💻')).toBe(true); // Complex emoji with ZWJ
      expect(isValidUtf8('🏳️‍🌈')).toBe(true); // Rainbow flag emoji
    });

    test('handles sequences correctly', () => {
      const highSurrogate = String.fromCharCode(0xD800);
      const lowSurrogate = String.fromCharCode(0xDC00);
      const validPair = highSurrogate + lowSurrogate;
      
      expect(isValidUtf8(validPair + validPair)).toBe(true); // Two valid pairs
      expect(isValidUtf8(validPair + highSurrogate)).toBe(false); // Valid pair + unpaired high
      expect(isValidUtf8('hello' + validPair + 'world')).toBe(true); // Valid pair in middle
    });
  });

  describe('validateStringFormat', () => {
    test('delegates to isAscii for ascii format', () => {
      expect(validateStringFormat('hello', 'ascii')).toBe(true);
      expect(validateStringFormat('héllo', 'ascii')).toBe(false);
    });

    test('delegates to isValidUtf8 for utf8 format', () => {
      expect(validateStringFormat('hello', 'utf8')).toBe(true);
      expect(validateStringFormat('héllo', 'utf8')).toBe(true);
      expect(validateStringFormat(String.fromCharCode(0xD800), 'utf8')).toBe(false);
    });

    test('returns true for invalid format (defensive)', () => {
      expect(validateStringFormat('hello', 'invalid' as any)).toBe(true);
    });
  });
});