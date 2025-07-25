import type {ArrayType} from '../../type/classes/ArrayType';
import type {TypeExportContext} from '../../system/TypeExportContext';
import type {JsonSchemaArray} from '../types';
import {getBaseJsonSchema} from './base';

export function arrayToJsonSchema(type: ArrayType<any>, ctx?: TypeExportContext): JsonSchemaArray {
  // Import here to avoid circular dependency
  const {typeToJsonSchema} = require('./index');
  
  const schema = type.getSchema();
  const baseSchema = getBaseJsonSchema(type, ctx);
  // Remove the generic 'type' property if it exists
  const {type: _, ...restBase} = baseSchema as any;
  
  const jsonSchema: JsonSchemaArray = {
    type: 'array',
    items: typeToJsonSchema((type as any).type, ctx),
    ...restBase,
  };
  
  if (schema.min !== undefined) jsonSchema.minItems = schema.min;
  if (schema.max !== undefined) jsonSchema.maxItems = schema.max;
  
  return jsonSchema;
}