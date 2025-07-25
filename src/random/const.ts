import {cloneBinary} from '@jsonjoy.com/util/lib/json-clone';
import type {ConstType} from '../type/classes/ConstType';

export function randomConst(type: ConstType): unknown {
  return cloneBinary(type.getSchema().value);
}