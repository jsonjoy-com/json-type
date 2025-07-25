import type {RefType} from '../../type/classes/RefType';
import type {TypeExportContext} from '../../system/TypeExportContext';
import type {JsonSchemaRef} from '../types';
import {getBaseJsonSchema} from './base';

export function refToJsonSchema(type: RefType<any>, ctx?: TypeExportContext): JsonSchemaRef {
  const ref = type.getSchema().ref;
  if (ctx) ctx.mentionRef(ref);
  
  return {
    $ref: `#/$defs/${ref}`,
    ...getBaseJsonSchema(type, ctx),
  };
}