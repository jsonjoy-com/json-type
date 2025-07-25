import type {StringType} from '../../type/classes/StringType';
import type {TypeExportContext} from '../../system/TypeExportContext';
import type {JsonSchemaString} from '../types';
import {getBaseJsonSchema} from './base';

export function stringToJsonSchema(type: StringType, ctx?: TypeExportContext): JsonSchemaString {
  const schema = type.getSchema();
  const jsonSchema: JsonSchemaString = {
    type: 'string' as const,
    ...getBaseJsonSchema(type, ctx),
  };
  
  if (schema.min !== undefined) jsonSchema.minLength = schema.min;
  if (schema.max !== undefined) jsonSchema.maxLength = schema.max;
  
  // Add format to JSON Schema if specified
  if (schema.format) {
    if (schema.format === 'ascii') {
      // JSON Schema doesn't have an "ascii" format, but we can use a pattern
      // ASCII characters are from 0x00 to 0x7F (0-127)
      jsonSchema.pattern = '^[\\x00-\\x7F]*$';
    }
    // UTF-8 is the default for JSON Schema strings, so we don't need to add anything special
  } else if (schema.ascii) {
    // Backward compatibility: if ascii=true, add pattern
    jsonSchema.pattern = '^[\\x00-\\x7F]*$';
  }
  
  return jsonSchema;
}