import type {BinaryType} from '../../type/classes/BinaryType';
import type {TypeExportContext} from '../../system/TypeExportContext';
import type {JsonSchemaBinary} from '../types';
import {getBaseJsonSchema} from './base';

export function binaryToJsonSchema(type: BinaryType<any>, ctx?: TypeExportContext): JsonSchemaBinary {
  const baseSchema = getBaseJsonSchema(type, ctx);
  // Remove the generic 'type' property if it exists
  const {type: _, ...restBase} = baseSchema as any;
  return {
    type: 'binary',
    ...restBase,
  };
}