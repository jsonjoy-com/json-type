import type {AbstractType} from '../type/classes/AbstractType';
import type {AnyType} from '../type/classes/AnyType';
import type {ArrayType} from '../type/classes/ArrayType';
import type {BinaryType} from '../type/classes/BinaryType';
import type {BooleanType} from '../type/classes/BooleanType';
import type {ConstType} from '../type/classes/ConstType';
import type {FunctionType} from '../type/classes/FunctionType';
import type {MapType} from '../type/classes/MapType';
import type {NumberType} from '../type/classes/NumberType';
import type {ObjectType} from '../type/classes/ObjectType';
import type {OrType} from '../type/classes/OrType';
import type {RefType} from '../type/classes/RefType';
import type {StringType} from '../type/classes/StringType';
import type {TupleType} from '../type/classes/TupleType';

import * as gen from './generators';

/**
 * Main router function that dispatches to the correct random generator based on the type's kind.
 * This replaces the individual random() methods in each type class.
 */
export function random(type: AbstractType<any>): unknown {
  const kind = type.getTypeName();
  
  switch (kind) {
    case 'any':
      return gen.any(type as AnyType);
    case 'arr':
      return gen.arr(type as ArrayType<any>);
    case 'bin':
      return gen.bin(type as BinaryType<any>);
    case 'bool':
      return gen.bool(type as BooleanType);
    case 'const':
      return gen.const_(type as ConstType);
    case 'fn':
    case 'fn$':
      return gen.fn(type as FunctionType<any, any>);
    case 'map':
      return gen.map(type as MapType<any>);
    case 'num':
      return gen.num(type as NumberType);
    case 'obj':
      return gen.obj(type as ObjectType<any>);
    case 'or':
      return gen.or(type as OrType<any>);
    case 'ref':
      return gen.ref(type as RefType<any>);
    case 'str':
      return gen.str(type as StringType);
    case 'tup':
      return gen.tup(type as TupleType<any>);
    default:
      // Fallback to generic random JSON for unknown types
      return gen.any(type as AnyType);
  }
}