import type {NumberType} from '../../type/classes/NumberType';
import type {TypeExportContext} from '../../system/TypeExportContext';
import type {JsonSchemaNumber} from '../types';
import {getBaseJsonSchema} from './base';
import {ints} from '../../util';

export function numberToJsonSchema(type: NumberType, ctx?: TypeExportContext): JsonSchemaNumber {
  const schema = type.getSchema();
  const baseSchema = getBaseJsonSchema(type, ctx);
  // Remove the generic 'type' property if it exists
  const {type: _, ...restBase} = baseSchema as any;
  
  const jsonSchema: JsonSchemaNumber = {
    type: 'number',
    ...restBase,
  };
  
  if (schema.format && ints.has(schema.format)) jsonSchema.type = 'integer';
  if (schema.gt !== undefined) jsonSchema.exclusiveMinimum = schema.gt;
  if (schema.gte !== undefined) jsonSchema.minimum = schema.gte;
  if (schema.lt !== undefined) jsonSchema.exclusiveMaximum = schema.lt;
  if (schema.lte !== undefined) jsonSchema.maximum = schema.lte;
  
  return jsonSchema;
}