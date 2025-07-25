import type {MapType} from '../../type/classes/MapType';
import type {TypeExportContext} from '../../system/TypeExportContext';
import type {JsonSchemaObject} from '../types';
import {getBaseJsonSchema} from './base';

export function mapToJsonSchema(type: MapType<any>, ctx?: TypeExportContext): JsonSchemaObject {
  // Import here to avoid circular dependency
  const {typeToJsonSchema} = require('./index');
  
  const baseSchema = getBaseJsonSchema(type, ctx);
  // Remove the generic 'type' property if it exists
  const {type: _, ...restBase} = baseSchema as any;
  
  return {
    type: 'object',
    patternProperties: {
      '.*': typeToJsonSchema((type as any).type, ctx),
    },
    ...restBase,
  };
}