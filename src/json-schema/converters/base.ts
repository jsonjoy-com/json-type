import type {AbstractType} from '../../type/classes/AbstractType';
import type {TypeExportContext} from '../../system/TypeExportContext';
import type {JsonSchemaGenericKeywords} from '../types';
import type * as schema from '../../schema';

/**
 * Extracts the base JSON Schema properties that are common to all types.
 * This replaces the logic from AbstractType.toJsonSchema().
 */
export function getBaseJsonSchema(type: AbstractType<any>, ctx?: TypeExportContext): JsonSchemaGenericKeywords {
  const typeSchema = type.getSchema();
  const jsonSchema: JsonSchemaGenericKeywords = {};
  
  if (typeSchema.title) jsonSchema.title = typeSchema.title;
  if (typeSchema.description) jsonSchema.description = typeSchema.description;
  if (typeSchema.examples) {
    jsonSchema.examples = typeSchema.examples.map((example: schema.TExample) => example.value);
  }
  
  return jsonSchema;
}