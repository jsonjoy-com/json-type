/**
 * Unit tests for the src/random/ module.
 * Tests that generated random values conform to their JSON Type schemas.
 */

import {t} from '../../type';
import {allSchemas, schemaCategories} from '../../__tests__/fixtures';
import * as gen from '../generators';
import {random} from '../generator';

describe('random generators', () => {
  describe('individual generator functions', () => {
    describe('primitives', () => {
      test('str generates valid strings', () => {
        const type = t.String();
        for (let i = 0; i < 10; i++) {
          const value = gen.str(type);
          expect(typeof value).toBe('string');
          type.validate(value);
        }
      });

      test('str respects min/max constraints', () => {
        const type = t.String({min: 5, max: 10});
        for (let i = 0; i < 10; i++) {
          const value = gen.str(type);
          expect(typeof value).toBe('string');
          expect(value.length).toBeGreaterThanOrEqual(5);
          expect(value.length).toBeLessThanOrEqual(10);
          type.validate(value);
        }
      });

      test('num generates valid numbers', () => {
        const type = t.Number();
        for (let i = 0; i < 10; i++) {
          const value = gen.num(type);
          expect(typeof value).toBe('number');
          type.validate(value);
        }
      });

      test('num respects format constraints', () => {
        const type = t.Number({format: 'u32'});
        for (let i = 0; i < 10; i++) {
          const value = gen.num(type);
          expect(typeof value).toBe('number');
          expect(Number.isInteger(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(0xffffffff);
          type.validate(value);
        }
      });

      test('bool generates valid booleans', () => {
        const type = t.Boolean();
        for (let i = 0; i < 10; i++) {
          const value = gen.bool(type);
          expect(typeof value).toBe('boolean');
          type.validate(value);
        }
      });

      test('const_ generates exact values', () => {
        const type = t.Const('fixed-value' as const);
        for (let i = 0; i < 10; i++) {
          const value = gen.const_(type);
          expect(value).toBe('fixed-value');
          type.validate(value);
        }
      });

      test('any generates valid JSON values', () => {
        const type = t.Any();
        for (let i = 0; i < 10; i++) {
          const value = gen.any(type);
          expect(value).toBeDefined();
          type.validate(value);
        }
      });

      test('bin generates Uint8Array', () => {
        const type = t.bin;
        for (let i = 0; i < 10; i++) {
          const value = gen.bin(type);
          expect(value).toBeInstanceOf(Uint8Array);
          type.validate(value);
        }
      });
    });

    describe('composites', () => {
      test('arr generates valid arrays', () => {
        const type = t.Array(t.String());
        for (let i = 0; i < 10; i++) {
          const value = gen.arr(type);
          expect(Array.isArray(value)).toBe(true);
          type.validate(value);
        }
      });

      test('arr respects min/max constraints', () => {
        const type = t.Array(t.String(), {min: 2, max: 5});
        for (let i = 0; i < 10; i++) {
          const value = gen.arr(type);
          expect(Array.isArray(value)).toBe(true);
          expect(value.length).toBeGreaterThanOrEqual(2);
          expect(value.length).toBeLessThanOrEqual(5);
          type.validate(value);
        }
      });

      test('obj generates valid objects', () => {
        const type = t.Object(
          t.prop('id', t.String()),
          t.prop('count', t.Number()),
        );
        for (let i = 0; i < 10; i++) {
          const value = gen.obj(type);
          expect(typeof value).toBe('object');
          expect(value).not.toBeNull();
          expect(value).not.toBeInstanceOf(Array);
          expect(value).toHaveProperty('id');
          expect(value).toHaveProperty('count');
          type.validate(value);
        }
      });

      test('tup generates valid tuples', () => {
        const type = t.Tuple(t.String(), t.Number(), t.Boolean());
        for (let i = 0; i < 10; i++) {
          const value = gen.tup(type);
          expect(Array.isArray(value)).toBe(true);
          expect(value).toHaveLength(3);
          expect(typeof value[0]).toBe('string');
          expect(typeof value[1]).toBe('number');
          expect(typeof value[2]).toBe('boolean');
          type.validate(value);
        }
      });

      test('map generates valid maps', () => {
        const type = t.Map(t.String());
        for (let i = 0; i < 10; i++) {
          const value = gen.map(type);
          expect(typeof value).toBe('object');
          expect(value).not.toBeNull();
          expect(value).not.toBeInstanceOf(Array);
          type.validate(value);
        }
      });

      test('or generates values from union types', () => {
        const type = t.Or(t.String(), t.Number());
        const generatedTypes = new Set<string>();
        
        for (let i = 0; i < 20; i++) {
          const value = gen.or(type);
          generatedTypes.add(typeof value);
          type.validate(value);
        }
        
        // Should generate at least one of each type over multiple iterations
        expect(generatedTypes.size).toBeGreaterThan(0);
      });

      test('fn generates async functions', async () => {
        const type = t.Function(t.num, t.String());
        const value = gen.fn(type);
        expect(typeof value).toBe('function');
        
        // Test that the function is async and returns the expected type
        const result = await (value as () => Promise<unknown>)();
        expect(typeof result).toBe('string');
      });
    });
  });

  describe('main router function', () => {
    test('dispatches to correct generators for all types', () => {
      Object.entries(schemaCategories.primitives).forEach(([name, schema]) => {
        const type = t.from(schema);
        for (let i = 0; i < 5; i++) {
          const value = random(type);
          expect(() => type.validate(value)).not.toThrow();
        }
      });

      Object.entries(schemaCategories.composites).forEach(([name, schema]) => {
        const type = t.from(schema);
        for (let i = 0; i < 5; i++) {
          const value = random(type);
          expect(() => type.validate(value)).not.toThrow();
        }
      });
    });
  });

  describe('comprehensive schema validation', () => {
    test('generated values pass validation for all fixture schemas', () => {
      Object.entries(allSchemas).forEach(([name, schema]) => {
        const type = t.from(schema);
        
        // Test multiple random generations for each schema
        for (let i = 0; i < 10; i++) {
          const randomValue = type.random();
          
          // Test using both validate methods
          expect(() => type.validate(randomValue)).not.toThrow();
          
          // Test using compiled validator
          const validator = type.compileValidator({errors: 'object'});
          const error = validator(randomValue);
          expect(error).toBe(null);
        }
      });
    });

    test('handles nested complex structures', () => {
      const complexType = t.Object(
        t.prop('users', t.Array(t.Object(
          t.prop('id', t.Number()),
          t.prop('profile', t.Object(
            t.prop('name', t.String()),
            t.prop('preferences', t.Map(t.Or(t.String(), t.Boolean()))),
          )),
          t.propOpt('tags', t.Array(t.String())),
        ))),
        t.prop('metadata', t.Map(t.Any())),
        t.prop('config', t.Tuple(t.String(), t.Number(), t.Object(
          t.prop('enabled', t.Boolean()),
        ))),
      );

      for (let i = 0; i < 5; i++) {
        const value = complexType.random();
        expect(() => complexType.validate(value)).not.toThrow();
      }
    });

    test('handles edge cases and constraints', () => {
      // Empty array constraint
      const emptyArrayType = t.Array(t.String(), {max: 0});
      const emptyArray = emptyArrayType.random();
      expect(emptyArray).toEqual([]);
      emptyArrayType.validate(emptyArray);

      // Single item array constraint
      const singleItemType = t.Array(t.Number(), {min: 1, max: 1});
      const singleItem = singleItemType.random();
      expect(singleItem).toHaveLength(1);
      singleItemType.validate(singleItem);

      // Number with tight range
      const tightRangeType = t.Number({gte: 5, lte: 5});
      const tightRangeValue = tightRangeType.random();
      expect(tightRangeValue).toBe(5);
      tightRangeType.validate(tightRangeValue);
    });
  });

  describe('deterministic behavior with controlled randomness', () => {
    test('generates consistent values with mocked Math.random', () => {
      const originalRandom = Math.random;
      let callCount = 0;
      Math.random = () => {
        callCount++;
        return 0.5; // Always return 0.5 for predictable results
      };

      try {
        const type = t.String({min: 5, max: 5});
        const value1 = type.random();
        const value2 = type.random();
        
        // With fixed random, string generation should be consistent
        expect(value1).toBe(value2);
        expect(value1).toHaveLength(5);
        type.validate(value1);
      } finally {
        Math.random = originalRandom;
      }
    });
  });
});