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

import {randomAny} from './any';
import {randomArray} from './array';
import {randomBinary} from './binary';
import {randomBoolean} from './boolean';
import {randomConst} from './const';
import {randomFunction} from './function';
import {randomMap} from './map';
import {randomNumber} from './number';
import {randomObject} from './object';
import {randomOr} from './or';
import {randomRef} from './ref';
import {randomString} from './string';
import {randomTuple} from './tuple';

/**
 * Main router function that dispatches to the correct random generator based on the type's kind.
 * This replaces the individual random() methods in each type class.
 */
export function generateRandom(type: AbstractType<any>): unknown {
  const kind = type.getTypeName();
  
  switch (kind) {
    case 'any':
      return randomAny(type as AnyType);
    case 'arr':
      return randomArray(type as ArrayType<any>);
    case 'bin':
      return randomBinary(type as BinaryType<any>);
    case 'bool':
      return randomBoolean(type as BooleanType);
    case 'const':
      return randomConst(type as ConstType);
    case 'fn':
    case 'fn$':
      return randomFunction(type as FunctionType<any, any>);
    case 'map':
      return randomMap(type as MapType<any>);
    case 'num':
      return randomNumber(type as NumberType);
    case 'obj':
      return randomObject(type as ObjectType<any>);
    case 'or':
      return randomOr(type as OrType<any>);
    case 'ref':
      return randomRef(type as RefType<any>);
    case 'str':
      return randomString(type as StringType);
    case 'tup':
      return randomTuple(type as TupleType<any>);
    default:
      // Fallback to generic random JSON for unknown types
      return randomAny(type);
  }
}