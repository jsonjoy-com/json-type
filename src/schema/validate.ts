import type {Display} from './common';
import type {TExample, TType, WithValidator, Schema} from './schema';

export const validateDisplay = ({title, description, intro}: Display): void => {
  if (title !== undefined && typeof title !== 'string') throw new Error('INVALID_TITLE');
  if (description !== undefined && typeof description !== 'string') throw new Error('INVALID_DESCRIPTION');
  if (intro !== undefined && typeof intro !== 'string') throw new Error('INVALID_INTRO');
};

export const validateTExample = (example: TExample): void => {
  validateDisplay(example);
};

export const validateTType = (tType: TType, kind: string): void => {
  validateDisplay(tType);
  const {id} = tType;
  if (id !== undefined && typeof id !== 'string') throw new Error('INVALID_ID');
  if (tType.kind !== kind) throw new Error('INVALID_TYPE');
  const {examples} = tType;
  if (examples) {
    if (!Array.isArray(examples)) throw new Error('INVALID_EXAMPLES');
    examples.forEach(validateTExample);
  }
};

export const validateWithValidator = ({validator}: WithValidator): void => {
  if (validator !== undefined) {
    if (Array.isArray(validator)) {
      for (const v of validator) if (typeof v !== 'string') throw new Error('INVALID_VALIDATOR');
    } else if (typeof validator !== 'string') throw new Error('INVALID_VALIDATOR');
  }
};

export const validateMinMax = (min: number | undefined, max: number | undefined) => {
  if (min !== undefined) {
    if (typeof min !== 'number') throw new Error('MIN_TYPE');
    if (min < 0) throw new Error('MIN_NEGATIVE');
    if (min % 1 !== 0) throw new Error('MIN_DECIMAL');
  }
  if (max !== undefined) {
    if (typeof max !== 'number') throw new Error('MAX_TYPE');
    if (max < 0) throw new Error('MAX_NEGATIVE');
    if (max % 1 !== 0) throw new Error('MAX_DECIMAL');
  }
  if (min !== undefined && max !== undefined && min > max) throw new Error('MIN_MAX');
};

// Individual schema validation functions for each type

const validateAnySchema = (schema: any): void => {
  validateTType(schema, 'any');
};

const validateBooleanSchema = (schema: any): void => {
  validateTType(schema, 'bool');
};

const validateNumberSchema = (schema: any): void => {
  validateTType(schema, 'num');
  validateWithValidator(schema);
  const {format, gt, gte, lt, lte} = schema;

  if (gt !== undefined && typeof gt !== 'number') throw new Error('GT_TYPE');
  if (gte !== undefined && typeof gte !== 'number') throw new Error('GTE_TYPE');
  if (lt !== undefined && typeof lt !== 'number') throw new Error('LT_TYPE');
  if (lte !== undefined && typeof lte !== 'number') throw new Error('LTE_TYPE');
  if (gt !== undefined && gte !== undefined) throw new Error('GT_GTE');
  if (lt !== undefined && lte !== undefined) throw new Error('LT_LTE');
  if ((gt !== undefined || gte !== undefined) && (lt !== undefined || lte !== undefined))
    if ((gt ?? gte)! > (lt ?? lte)!) throw new Error('GT_LT');

  if (format !== undefined) {
    if (typeof format !== 'string') throw new Error('FORMAT_TYPE');
    if (!format) throw new Error('FORMAT_EMPTY');
    switch (format) {
      case 'i':
      case 'u':
      case 'f':
      case 'i8':
      case 'i16':
      case 'i32':
      case 'i64':
      case 'u8':
      case 'u16':
      case 'u32':
      case 'u64':
      case 'f32':
      case 'f64':
        break;
      default:
        throw new Error('FORMAT_INVALID');
    }
  }
};

const validateStringSchema = (schema: any): void => {
  validateTType(schema, 'str');
  validateWithValidator(schema);
  const {min, max, ascii, noJsonEscape, format} = schema;

  validateMinMax(min, max);

  if (ascii !== undefined) {
    if (typeof ascii !== 'boolean') throw new Error('ASCII');
  }
  if (noJsonEscape !== undefined) {
    if (typeof noJsonEscape !== 'boolean') throw new Error('NO_JSON_ESCAPE_TYPE');
  }
  if (format !== undefined) {
    if (format !== 'ascii' && format !== 'utf8') {
      throw new Error('INVALID_STRING_FORMAT');
    }
    // If both format and ascii are specified, they should be consistent
    if (ascii !== undefined && format === 'ascii' && !ascii) {
      throw new Error('FORMAT_ASCII_MISMATCH');
    }
  }
};

const binaryFormats = new Set(['bencode', 'bson', 'cbor', 'ion', 'json', 'msgpack', 'resp3', 'ubjson']);

const validateBinarySchema = (schema: any, validateChildSchema: (schema: Schema) => void): void => {
  validateTType(schema, 'bin');
  const {min, max, format} = schema;
  validateMinMax(min, max);
  if (format !== undefined) {
    if (!binaryFormats.has(format)) throw new Error('FORMAT');
  }
  validateChildSchema(schema.type);
};

const validateArraySchema = (schema: any, validateChildSchema: (schema: Schema) => void): void => {
  validateTType(schema, 'arr');
  const {min, max} = schema;
  validateMinMax(min, max);
  validateChildSchema(schema.type);
};

const validateConstSchema = (schema: any): void => {
  validateTType(schema, 'con');
};

const validateTupleSchema = (schema: any, validateChildSchema: (schema: Schema) => void): void => {
  validateTType(schema, 'tup');
  validateWithValidator(schema);
  const {types} = schema;
  if (!Array.isArray(types)) throw new Error('TYPES_TYPE');
  for (const type of types) validateChildSchema(type);
};

const validateObjectSchema = (schema: any, validateChildSchema: (schema: Schema) => void): void => {
  validateTType(schema, 'obj');
  validateWithValidator(schema);
  const {fields, unknownFields} = schema;
  if (!Array.isArray(fields)) throw new Error('FIELDS_TYPE');
  if (unknownFields !== undefined && typeof unknownFields !== 'boolean') throw new Error('UNKNOWN_FIELDS_TYPE');
  for (const field of fields) validateChildSchema(field);
};

const validateFieldSchema = (schema: any, validateChildSchema: (schema: Schema) => void): void => {
  validateTType(schema, 'field');
  const {key, optional} = schema;
  if (typeof key !== 'string') throw new Error('KEY_TYPE');
  if (optional !== undefined && typeof optional !== 'boolean') throw new Error('OPTIONAL_TYPE');
  validateChildSchema(schema.type);
};

const validateMapSchema = (schema: any, validateChildSchema: (schema: Schema) => void): void => {
  validateTType(schema, 'map');
  validateChildSchema(schema.type);
};

const validateRefSchema = (schema: any): void => {
  validateTType(schema, 'ref');
  const {ref} = schema;
  if (typeof ref !== 'string') throw new Error('REF_TYPE');
  if (!ref) throw new Error('REF_EMPTY');
};

const validateOrSchema = (schema: any, validateChildSchema: (schema: Schema) => void): void => {
  validateTType(schema, 'or');
  const {types, discriminator} = schema;
  if (!discriminator || (discriminator[0] === 'num' && discriminator[1] === -1)) throw new Error('DISCRIMINATOR');
  if (!Array.isArray(types)) throw new Error('TYPES_TYPE');
  if (!types.length) throw new Error('TYPES_LENGTH');
  for (const type of types) validateChildSchema(type);
};

const validateFunctionSchema = (schema: any, validateChildSchema: (schema: Schema) => void): void => {
  validateTType(schema, 'fn');
  validateChildSchema(schema.req);
  validateChildSchema(schema.res);
};

const validateFunctionStreamingSchema = (schema: any, validateChildSchema: (schema: Schema) => void): void => {
  validateTType(schema, 'fn$');
  validateChildSchema(schema.req);
  validateChildSchema(schema.res);
};

/**
 * Main router function that validates a schema based on its kind.
 * This replaces the individual validateSchema() methods from type classes.
 */
export const validateSchema = (schema: Schema): void => {
  switch (schema.kind) {
    case 'any':
      validateAnySchema(schema);
      break;
    case 'bool':
      validateBooleanSchema(schema);
      break;
    case 'num':
      validateNumberSchema(schema);
      break;
    case 'str':
      validateStringSchema(schema);
      break;
    case 'bin':
      validateBinarySchema(schema, validateSchema);
      break;
    case 'arr':
      validateArraySchema(schema, validateSchema);
      break;
    case 'con':
      validateConstSchema(schema);
      break;
    case 'tup':
      validateTupleSchema(schema, validateSchema);
      break;
    case 'obj':
      validateObjectSchema(schema, validateSchema);
      break;
    case 'field':
      validateFieldSchema(schema, validateSchema);
      break;
    case 'map':
      validateMapSchema(schema, validateSchema);
      break;
    case 'ref':
      validateRefSchema(schema);
      break;
    case 'or':
      validateOrSchema(schema, validateSchema);
      break;
    case 'fn':
      validateFunctionSchema(schema, validateSchema);
      break;
    case 'fn$':
      validateFunctionStreamingSchema(schema, validateSchema);
      break;
    default:
      throw new Error(`Unknown schema kind: ${(schema as any).kind}`);
  }
};
