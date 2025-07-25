import {RandomJson} from '@jsonjoy.com/util/lib/json-random';
import type {AbstractType} from '../type/classes/AbstractType';

export function randomAny(type: AbstractType<any>): unknown {
  return RandomJson.generate({nodeCount: 5});
}