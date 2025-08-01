import {
  validateDisplay,
  validateTExample,
  validateTType,
  validateWithValidator,
  validateMinMax,
  validateSchema,
} from '../validate';
import type {TExample, TType, WithValidator, Schema} from '../schema';
import type {Display} from '../common';

describe('validateDisplay', () => {
  test('validates valid display', () => {
    expect(() => validateDisplay({})).not.toThrow();
    expect(() => validateDisplay({title: 'Test'})).not.toThrow();
    expect(() => validateDisplay({description: 'Test description'})).not.toThrow();
    expect(() => validateDisplay({intro: 'Test intro'})).not.toThrow();
    expect(() =>
      validateDisplay({
        title: 'Test',
        description: 'Test description',
        intro: 'Test intro',
      }),
    ).not.toThrow();
  });

  test('throws for invalid title', () => {
    expect(() => validateDisplay({title: 123} as any)).toThrow('INVALID_TITLE');
    expect(() => validateDisplay({title: null} as any)).toThrow('INVALID_TITLE');
    expect(() => validateDisplay({title: {}} as any)).toThrow('INVALID_TITLE');
  });

  test('throws for invalid description', () => {
    expect(() => validateDisplay({description: 123} as any)).toThrow('INVALID_DESCRIPTION');
    expect(() => validateDisplay({description: null} as any)).toThrow('INVALID_DESCRIPTION');
    expect(() => validateDisplay({description: []} as any)).toThrow('INVALID_DESCRIPTION');
  });

  test('throws for invalid intro', () => {
    expect(() => validateDisplay({intro: 123} as any)).toThrow('INVALID_INTRO');
    expect(() => validateDisplay({intro: null} as any)).toThrow('INVALID_INTRO');
    expect(() => validateDisplay({intro: false} as any)).toThrow('INVALID_INTRO');
  });
});

describe('validateTExample', () => {
  test('validates valid example', () => {
    const example: TExample = {value: 'test'};
    expect(() => validateTExample(example)).not.toThrow();
  });

  test('validates example with display properties', () => {
    const example: TExample = {
      value: 'test',
      title: 'Example',
      description: 'Test example',
    };
    expect(() => validateTExample(example)).not.toThrow();
  });

  test('throws for invalid display properties', () => {
    expect(() => validateTExample({title: 123} as any)).toThrow('INVALID_TITLE');
  });
});

describe('validateTType', () => {
  test('validates valid TType', () => {
    const ttype: TType = {kind: 'str'};
    expect(() => validateTType(ttype, 'str')).not.toThrow();
  });

  test('validates TType with id', () => {
    const ttype: TType = {kind: 'str', id: 'test-id'};
    expect(() => validateTType(ttype, 'str')).not.toThrow();
  });

  test('validates TType with examples', () => {
    const ttype: TType = {
      kind: 'str',
      examples: [
        {value: 'test1', title: 'Example 1'},
        {value: 'test2', description: 'Example 2'},
      ],
    };
    expect(() => validateTType(ttype, 'str')).not.toThrow();
  });

  test('throws for invalid kind', () => {
    const ttype: TType = {kind: 'str'};
    expect(() => validateTType(ttype, 'num')).toThrow('INVALID_TYPE');
  });

  test('throws for invalid id', () => {
    expect(() => validateTType({kind: 'str', id: 123} as any, 'str')).toThrow('INVALID_ID');
    expect(() => validateTType({kind: 'str', id: null} as any, 'str')).toThrow('INVALID_ID');
  });

  test('throws for invalid examples', () => {
    expect(() => validateTType({kind: 'str', examples: 'not-array'} as any, 'str')).toThrow('INVALID_EXAMPLES');
    expect(() => validateTType({kind: 'str', examples: [{value: 'test', title: 123}]} as any, 'str')).toThrow(
      'INVALID_TITLE',
    );
  });

  test('validates display properties', () => {
    expect(() => validateTType({kind: 'str', title: 123} as any, 'str')).toThrow('INVALID_TITLE');
  });
});

describe('validateWithValidator', () => {
  test('validates empty validator', () => {
    expect(() => validateWithValidator({})).not.toThrow();
  });

  test('validates string validator', () => {
    const withValidator: WithValidator = {validator: 'test-validator'};
    expect(() => validateWithValidator(withValidator)).not.toThrow();
  });

  test('validates array validator', () => {
    const withValidator: WithValidator = {validator: ['validator1', 'validator2']};
    expect(() => validateWithValidator(withValidator)).not.toThrow();
  });

  test('throws for non-string validator', () => {
    expect(() => validateWithValidator({validator: 123} as any)).toThrow('INVALID_VALIDATOR');
    expect(() => validateWithValidator({validator: null} as any)).toThrow('INVALID_VALIDATOR');
    expect(() => validateWithValidator({validator: {}} as any)).toThrow('INVALID_VALIDATOR');
  });

  test('throws for array with non-string elements', () => {
    expect(() => validateWithValidator({validator: ['valid', 123]} as any)).toThrow('INVALID_VALIDATOR');
    expect(() => validateWithValidator({validator: [null, 'valid']} as any)).toThrow('INVALID_VALIDATOR');
  });
});

describe('validateMinMax', () => {
  test('validates empty min/max', () => {
    expect(() => validateMinMax(undefined, undefined)).not.toThrow();
  });

  test('validates valid min/max', () => {
    expect(() => validateMinMax(0, 10)).not.toThrow();
    expect(() => validateMinMax(5, undefined)).not.toThrow();
    expect(() => validateMinMax(undefined, 15)).not.toThrow();
  });

  test('throws for invalid min type', () => {
    expect(() => validateMinMax('5' as any, undefined)).toThrow('MIN_TYPE');
    expect(() => validateMinMax(null as any, undefined)).toThrow('MIN_TYPE');
  });

  test('throws for invalid max type', () => {
    expect(() => validateMinMax(undefined, '10' as any)).toThrow('MAX_TYPE');
    expect(() => validateMinMax(undefined, {} as any)).toThrow('MAX_TYPE');
  });

  test('throws for negative min', () => {
    expect(() => validateMinMax(-1, undefined)).toThrow('MIN_NEGATIVE');
    expect(() => validateMinMax(-10, undefined)).toThrow('MIN_NEGATIVE');
  });

  test('throws for negative max', () => {
    expect(() => validateMinMax(undefined, -1)).toThrow('MAX_NEGATIVE');
    expect(() => validateMinMax(undefined, -5)).toThrow('MAX_NEGATIVE');
  });

  test('throws for decimal min', () => {
    expect(() => validateMinMax(1.5, undefined)).toThrow('MIN_DECIMAL');
    expect(() => validateMinMax(0.1, undefined)).toThrow('MIN_DECIMAL');
  });

  test('throws for decimal max', () => {
    expect(() => validateMinMax(undefined, 1.5)).toThrow('MAX_DECIMAL');
    expect(() => validateMinMax(undefined, 10.9)).toThrow('MAX_DECIMAL');
  });

  test('throws when min > max', () => {
    expect(() => validateMinMax(10, 5)).toThrow('MIN_MAX');
    expect(() => validateMinMax(1, 0)).toThrow('MIN_MAX');
  });

  test('allows min = max', () => {
    expect(() => validateMinMax(5, 5)).not.toThrow();
    expect(() => validateMinMax(0, 0)).not.toThrow();
  });
});

describe('validateSchema', () => {
  describe('any schema', () => {
    test('validates valid any schema', () => {
      const schema: Schema = {kind: 'any'};
      expect(() => validateSchema(schema)).not.toThrow();
    });

    test('validates any schema with metadata', () => {
      const schema: Schema = {
        kind: 'any',
        metadata: {custom: 'value'},
      };
      expect(() => validateSchema(schema)).not.toThrow();
    });
  });

  describe('boolean schema', () => {
    test('validates valid boolean schema', () => {
      const schema: Schema = {kind: 'bool'};
      expect(() => validateSchema(schema)).not.toThrow();
    });
  });

  describe('number schema', () => {
    test('validates valid number schema', () => {
      const schema: Schema = {kind: 'num'};
      expect(() => validateSchema(schema)).not.toThrow();
    });

    test('validates number schema with constraints', () => {
      const schema: Schema = {
        kind: 'num',
        gt: 0,
        lt: 100,
        format: 'i32',
      };
      expect(() => validateSchema(schema)).not.toThrow();
    });

    test('validates number schema with gte/lte', () => {
      const schema: Schema = {
        kind: 'num',
        gte: 0,
        lte: 100,
      };
      expect(() => validateSchema(schema)).not.toThrow();
    });

    test('throws for invalid constraint types', () => {
      expect(() => validateSchema({kind: 'num', gt: '5'} as any)).toThrow('GT_TYPE');
      expect(() => validateSchema({kind: 'num', gte: null} as any)).toThrow('GTE_TYPE');
      expect(() => validateSchema({kind: 'num', lt: {}} as any)).toThrow('LT_TYPE');
      expect(() => validateSchema({kind: 'num', lte: []} as any)).toThrow('LTE_TYPE');
    });

    test('throws for conflicting constraints', () => {
      expect(() => validateSchema({kind: 'num', gt: 5, gte: 3} as any)).toThrow('GT_GTE');
      expect(() => validateSchema({kind: 'num', lt: 10, lte: 15} as any)).toThrow('LT_LTE');
    });

    test('throws for invalid range', () => {
      expect(() => validateSchema({kind: 'num', gt: 10, lt: 5} as any)).toThrow('GT_LT');
      expect(() => validateSchema({kind: 'num', gte: 10, lte: 5} as any)).toThrow('GT_LT');
    });

    test('validates all number formats', () => {
      const formats = ['i', 'u', 'f', 'i8', 'i16', 'i32', 'i64', 'u8', 'u16', 'u32', 'u64', 'f32', 'f64'] as const;
      for (const format of formats) {
        expect(() => validateSchema({kind: 'num', format})).not.toThrow();
      }
    });

    test('throws for invalid format', () => {
      expect(() => validateSchema({kind: 'num', format: 'invalid'} as any)).toThrow('FORMAT_INVALID');
      expect(() => validateSchema({kind: 'num', format: ''} as any)).toThrow('FORMAT_EMPTY');
      expect(() => validateSchema({kind: 'num', format: 123} as any)).toThrow('FORMAT_TYPE');
    });
  });

  describe('string schema', () => {
    test('validates valid string schema', () => {
      const schema: Schema = {kind: 'str'};
      expect(() => validateSchema(schema)).not.toThrow();
    });

    test('validates string schema with constraints', () => {
      const schema: Schema = {
        kind: 'str',
        min: 1,
        max: 100,
        format: 'ascii',
      };
      expect(() => validateSchema(schema)).not.toThrow();
    });

    test('validates string formats', () => {
      expect(() => validateSchema({kind: 'str', format: 'ascii'})).not.toThrow();
      expect(() => validateSchema({kind: 'str', format: 'utf8'})).not.toThrow();
    });

    test('throws for invalid string format', () => {
      expect(() => validateSchema({kind: 'str', format: 'invalid'} as any)).toThrow('INVALID_STRING_FORMAT');
    });

    test('validates ascii property', () => {
      expect(() => validateSchema({kind: 'str', ascii: true})).not.toThrow();
      expect(() => validateSchema({kind: 'str', ascii: false})).not.toThrow();
    });

    test('throws for invalid ascii type', () => {
      expect(() => validateSchema({kind: 'str', ascii: 'true'} as any)).toThrow('ASCII');
    });

    test('validates noJsonEscape property', () => {
      expect(() => validateSchema({kind: 'str', noJsonEscape: true})).not.toThrow();
      expect(() => validateSchema({kind: 'str', noJsonEscape: false})).not.toThrow();
    });

    test('throws for invalid noJsonEscape type', () => {
      expect(() => validateSchema({kind: 'str', noJsonEscape: 'true'} as any)).toThrow('NO_JSON_ESCAPE_TYPE');
    });

    test('throws for format/ascii mismatch', () => {
      expect(() => validateSchema({kind: 'str', format: 'ascii', ascii: false} as any)).toThrow(
        'FORMAT_ASCII_MISMATCH',
      );
    });
  });

  describe('binary schema', () => {
    test('validates valid binary schema', () => {
      const schema: Schema = {
        kind: 'bin',
        type: {kind: 'str'},
      };
      expect(() => validateSchema(schema)).not.toThrow();
    });

    test('validates binary schema with format', () => {
      const formats = ['json', 'cbor', 'msgpack', 'resp3', 'ion', 'bson', 'ubjson', 'bencode'] as const;
      for (const format of formats) {
        const schema: Schema = {
          kind: 'bin',
          type: {kind: 'str'},
          format,
        };
        expect(() => validateSchema(schema)).not.toThrow();
      }
    });

    test('throws for invalid format', () => {
      expect(() =>
        validateSchema({
          kind: 'bin',
          value: {kind: 'str'},
          format: 'invalid',
        } as any),
      ).toThrow('FORMAT');
    });
  });

  describe('array schema', () => {
    test('validates valid array schema', () => {
      const schema: Schema = {
        kind: 'arr',
        type: {kind: 'str'},
      };
      expect(() => validateSchema(schema)).not.toThrow();
    });

    test('validates array schema with constraints', () => {
      const schema: Schema = {
        kind: 'arr',
        type: {kind: 'num'},
        min: 1,
        max: 10,
      };
      expect(() => validateSchema(schema)).not.toThrow();
    });
  });

  describe('const schema', () => {
    test('validates valid const schema', () => {
      const schema: Schema = {kind: 'con', value: 'test'};
      expect(() => validateSchema(schema)).not.toThrow();
    });
  });

  describe('tuple schema', () => {
    test('validates valid tuple schema', () => {
      const schema: Schema = {
        kind: 'tup',
        types: [{kind: 'str'}, {kind: 'num'}],
      };
      expect(() => validateSchema(schema)).not.toThrow();
    });

    test('throws for invalid types property', () => {
      expect(() => validateSchema({kind: 'tup', types: 'not-array'} as any)).toThrow('TYPES_TYPE');
    });
  });

  describe('object schema', () => {
    test('validates valid object schema', () => {
      const schema: Schema = {
        kind: 'obj',
        fields: [
          {
            kind: 'field',
            key: 'name',
            value: {kind: 'str'},
          },
        ],
      };
      expect(() => validateSchema(schema)).not.toThrow();
    });

    test('validates object schema with unknownFields', () => {
      const schema: Schema = {
        kind: 'obj',
        fields: [],
        unknownFields: true,
      };
      expect(() => validateSchema(schema)).not.toThrow();
    });

    test('throws for invalid fields type', () => {
      expect(() => validateSchema({kind: 'obj', fields: 'not-array'} as any)).toThrow('FIELDS_TYPE');
    });

    test('throws for invalid unknownFields type', () => {
      expect(() => validateSchema({kind: 'obj', fields: [], unknownFields: 'true'} as any)).toThrow(
        'UNKNOWN_FIELDS_TYPE',
      );
    });
  });

  describe('field schema', () => {
    test('validates valid field schema', () => {
      const schema: Schema = {
        kind: 'field',
        key: 'test',
        value: {kind: 'str'},
      };
      expect(() => validateSchema(schema)).not.toThrow();
    });

    test('validates optional field schema', () => {
      const schema: Schema = {
        kind: 'field',
        key: 'test',
        value: {kind: 'str'},
        optional: true,
      };
      expect(() => validateSchema(schema)).not.toThrow();
    });

    test('throws for invalid key type', () => {
      expect(() =>
        validateSchema({
          kind: 'field',
          key: 123,
          value: {kind: 'str'},
        } as any),
      ).toThrow('KEY_TYPE');
    });

    test('throws for invalid optional type', () => {
      expect(() =>
        validateSchema({
          kind: 'field',
          key: 'test',
          value: {kind: 'str'},
          optional: 'true',
        } as any),
      ).toThrow('OPTIONAL_TYPE');
    });
  });

  describe('map schema', () => {
    test('validates valid map schema', () => {
      const schema: Schema = {
        kind: 'map',
        value: {kind: 'str'},
      };
      expect(() => validateSchema(schema)).not.toThrow();
    });
  });

  describe('ref schema', () => {
    test('validates valid ref schema', () => {
      const schema: Schema = {
        kind: 'ref',
        ref: 'TestType' as any,
      };
      expect(() => validateSchema(schema)).not.toThrow();
    });

    test('throws for invalid ref type', () => {
      expect(() => validateSchema({kind: 'ref', ref: 123} as any)).toThrow('REF_TYPE');
    });

    test('throws for empty ref', () => {
      expect(() => validateSchema({kind: 'ref', ref: ''} as any)).toThrow('REF_EMPTY');
    });
  });

  describe('or schema', () => {
    test('validates valid or schema', () => {
      const schema: Schema = {
        kind: 'or',
        types: [{kind: 'str'}, {kind: 'num'}],
        discriminator: ['str', 0],
      };
      expect(() => validateSchema(schema)).not.toThrow();
    });

    test('throws for invalid discriminator', () => {
      expect(() =>
        validateSchema({
          kind: 'or',
          types: [{kind: 'str'}],
          discriminator: null,
        } as any),
      ).toThrow('DISCRIMINATOR');
    });

    test('throws for invalid types', () => {
      expect(() =>
        validateSchema({
          kind: 'or',
          types: 'not-array',
          discriminator: ['str', 0],
        } as any),
      ).toThrow('TYPES_TYPE');
    });

    test('throws for empty types', () => {
      expect(() =>
        validateSchema({
          kind: 'or',
          types: [],
          discriminator: ['str', 0],
        } as any),
      ).toThrow('TYPES_LENGTH');
    });
  });

  describe('function schema', () => {
    test('validates valid function schema', () => {
      const schema: Schema = {
        kind: 'fn',
        req: {kind: 'str'},
        res: {kind: 'num'},
      };
      expect(() => validateSchema(schema)).not.toThrow();
    });
  });

  describe('streaming function schema', () => {
    test('validates valid streaming function schema', () => {
      const schema: Schema = {
        kind: 'fn$',
        req: {kind: 'str'},
        res: {kind: 'num'},
      };
      expect(() => validateSchema(schema)).not.toThrow();
    });
  });

  describe('unknown schema kind', () => {
    test('throws for unknown schema kind', () => {
      expect(() => validateSchema({kind: 'unknown'} as any)).toThrow('Unknown schema kind: unknown');
    });
  });
});
