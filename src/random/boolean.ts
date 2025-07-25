import {RandomJson} from '@jsonjoy.com/util/lib/json-random';
import type {BooleanType} from '../type/classes/BooleanType';

export function randomBoolean(type: BooleanType): boolean {
  return RandomJson.genBoolean();
}