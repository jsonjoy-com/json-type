import type {ConstType} from '../../type/classes/ConstType';
import type {TypeExportContext} from '../../system/TypeExportContext';
import type {JsonSchemaValueNode} from '../types';
import {getBaseJsonSchema} from './base';

export function constToJsonSchema(type: ConstType<any>, ctx?: TypeExportContext): JsonSchemaValueNode {
  const schema = type.getSchema();
  const baseSchema = getBaseJsonSchema(type, ctx);
  // Remove the generic 'type' property if it exists  
  const {type: _, ...restBase} = baseSchema as any;
  return {
    type: typeof schema.value as any,
    const: schema.value,
    ...restBase,
  };
}