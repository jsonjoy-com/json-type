import type {TupleType} from '../../type/classes/TupleType';
import type {TypeExportContext} from '../../system/TypeExportContext';
import type {JsonSchemaArray} from '../types';
import type {Type} from '../../type';
import {getBaseJsonSchema} from './base';

export function tupleToJsonSchema(type: TupleType<any>, ctx?: TypeExportContext): JsonSchemaArray {
  // Import here to avoid circular dependency
  const {typeToJsonSchema} = require('./index');
  
  return {
    type: 'array' as const,
    prefixItems: (type as any).types.map((subType: Type) => typeToJsonSchema(subType, ctx)),
    items: false,
    ...getBaseJsonSchema(type, ctx),
  };
}