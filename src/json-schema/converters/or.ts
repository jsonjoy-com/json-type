import type {OrType} from '../../type/classes/OrType';
import type {TypeExportContext} from '../../system/TypeExportContext';
import type {JsonSchemaOr} from '../types';
import type {Type} from '../../type';
import {getBaseJsonSchema} from './base';

export function orToJsonSchema(type: OrType<any>, ctx?: TypeExportContext): JsonSchemaOr {
  // Import here to avoid circular dependency
  const {typeToJsonSchema} = require('./index');
  
  return {
    anyOf: (type as any).types.map((subType: Type) => typeToJsonSchema(subType, ctx)),
    ...getBaseJsonSchema(type, ctx),
  };
}