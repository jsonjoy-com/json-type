import type {AnyType} from '../../type/classes/AnyType';
import type {TypeExportContext} from '../../system/TypeExportContext';
import type {JsonSchemaAny} from '../types';
import {getBaseJsonSchema} from './base';

export function anyToJsonSchema(type: AnyType, ctx?: TypeExportContext): JsonSchemaAny {
  const baseSchema = getBaseJsonSchema(type, ctx);
  // Remove the generic 'type' property if it exists
  const {type: _, ...restBase} = baseSchema as any;
  return {
    type: ['string', 'number', 'boolean', 'null', 'array', 'object'] as Array<'string' | 'number' | 'boolean' | 'null' | 'array' | 'object'>,
    ...restBase,
  };
}