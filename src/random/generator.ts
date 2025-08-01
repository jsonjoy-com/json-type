import type {AbsType} from '../type/classes/AbsType';
import type {AnyType} from '../type/classes/AnyType';
import type {ArrType} from '../type/classes/ArrType';
import type {BinType} from '../type/classes/BinType';
import type {BoolType} from '../type/classes/BoolType';
import type {ConType} from '../type/classes/ConType';
import type {FnType} from '../type/classes/FnType';
import type {MapType} from '../type/classes/MapType';
import type {NumType} from '../type/classes/NumType';
import type {ObjType} from '../type/classes/ObjType';
import type {OrType} from '../type/classes/OrType';
import type {RefType} from '../type/classes/RefType';
import type {StrType} from '../type/classes/StrType';
import type {TupType} from '../type/classes/TupType';

import * as gen from './generators';

/**
 * Main router function that dispatches to the correct random generator based on the type's kind.
 * This replaces the individual random() methods in each type class.
 */
export function random(type: AbsType<any>): unknown {
  const kind = type.getTypeName();

  switch (kind) {
    case 'any':
      return gen.any(type as AnyType);
    case 'arr':
      return gen.arr(type as ArrType<any>);
    case 'bin':
      return gen.bin(type as BinType<any>);
    case 'bool':
      return gen.bool(type as BoolType);
    case 'con':
      return gen.const_(type as ConType);
    case 'fn':
    case 'fn$':
      return gen.fn(type as FnType<any, any>);
    case 'map':
      return gen.map(type as MapType<any>);
    case 'num':
      return gen.num(type as NumType);
    case 'obj':
      return gen.obj(type as ObjType<any>);
    case 'or':
      return gen.or(type as OrType<any>);
    case 'ref':
      return gen.ref(type as RefType<any>);
    case 'str':
      return gen.str(type as StrType);
    case 'tup':
      return gen.tup(type as TupType<any>);
    default:
      // Fallback to generic random JSON for unknown types
      return gen.any(type as AnyType);
  }
}
