import type {Type} from '../../type';
import type {TypeExportContext} from '../../system/TypeExportContext';
import type {JsonSchemaNode} from '../types';
import {AnyType} from '../../type/classes/AnyType';
import {ArrayType} from '../../type/classes/ArrayType';
import {BinaryType} from '../../type/classes/BinaryType';
import {BooleanType} from '../../type/classes/BooleanType';
import {ConstType} from '../../type/classes/ConstType';
import {MapType} from '../../type/classes/MapType';
import {NumberType} from '../../type/classes/NumberType';
import {ObjectType} from '../../type/classes/ObjectType';
import {OrType} from '../../type/classes/OrType';
import {RefType} from '../../type/classes/RefType';
import {StringType} from '../../type/classes/StringType';
import {TupleType} from '../../type/classes/TupleType';

import {anyToJsonSchema} from './any';
import {arrayToJsonSchema} from './array';
import {binaryToJsonSchema} from './binary';
import {booleanToJsonSchema} from './boolean';
import {constToJsonSchema} from './const';
import {mapToJsonSchema} from './map';
import {numberToJsonSchema} from './number';
import {objectToJsonSchema} from './object';
import {orToJsonSchema} from './or';
import {refToJsonSchema} from './ref';
import {stringToJsonSchema} from './string';
import {tupleToJsonSchema} from './tuple';

/**
 * Main router function that converts any Type to JsonSchemaNode.
 * This replaces the individual toJsonSchema() methods on type classes.
 */
export function typeToJsonSchema(type: Type, ctx?: TypeExportContext): JsonSchemaNode {
  if (type instanceof AnyType) return anyToJsonSchema(type, ctx);
  if (type instanceof ArrayType) return arrayToJsonSchema(type, ctx);
  if (type instanceof BinaryType) return binaryToJsonSchema(type, ctx);
  if (type instanceof BooleanType) return booleanToJsonSchema(type, ctx);
  if (type instanceof ConstType) return constToJsonSchema(type, ctx);
  if (type instanceof MapType) return mapToJsonSchema(type, ctx);
  if (type instanceof NumberType) return numberToJsonSchema(type, ctx);
  if (type instanceof ObjectType) return objectToJsonSchema(type, ctx);
  if (type instanceof OrType) return orToJsonSchema(type, ctx);
  if (type instanceof RefType) return refToJsonSchema(type, ctx);
  if (type instanceof StringType) return stringToJsonSchema(type, ctx);  
  if (type instanceof TupleType) return tupleToJsonSchema(type, ctx);
  
  throw new Error(`Unsupported type: ${type.constructor.name}`);
}