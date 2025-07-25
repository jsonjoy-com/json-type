import type {BooleanType} from '../../type/classes/BooleanType';
import type {TypeExportContext} from '../../system/TypeExportContext';
import type {JsonSchemaBoolean} from '../types';
import {getBaseJsonSchema} from './base';

export function booleanToJsonSchema(type: BooleanType, ctx?: TypeExportContext): JsonSchemaBoolean {
  const baseSchema = getBaseJsonSchema(type, ctx);
  // Remove the generic 'type' property if it exists
  const {type: _, ...restBase} = baseSchema as any;
  return {
    type: 'boolean',
    ...restBase,
  };
}