import type {ObjectType} from '../../type/classes/ObjectType';
import {ObjectOptionalFieldType} from '../../type/classes/ObjectType';
import type {TypeExportContext} from '../../system/TypeExportContext';
import type {JsonSchemaObject} from '../types';
import {getBaseJsonSchema} from './base';

export function objectToJsonSchema(type: ObjectType<any>, ctx?: TypeExportContext): JsonSchemaObject {
  // Import here to avoid circular dependency
  const {typeToJsonSchema} = require('./index');
  
  const baseSchema = getBaseJsonSchema(type, ctx);
  // Remove the generic 'type' property if it exists
  const {type: _, ...restBase} = baseSchema as any;
  
  const jsonSchema: JsonSchemaObject = {
    type: 'object',
    properties: {},
    ...restBase,
  };
  
  const required = [];
  for (const field of (type as any).fields) {
    jsonSchema.properties![field.key] = typeToJsonSchema(field.value, ctx);
    if (!(field instanceof ObjectOptionalFieldType)) required.push(field.key);
  }
  
  if (required.length) jsonSchema.required = required;
  if (type.getSchema().unknownFields === false) jsonSchema.additionalProperties = false;
  
  return jsonSchema;
}