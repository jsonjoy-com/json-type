import {RandomJson} from '@jsonjoy.com/util/lib/json-random';
import type {BinaryType} from '../type/classes/BinaryType';

export function randomBinary(type: BinaryType<any>): Uint8Array {
  const octets = RandomJson.genString()
    .split('')
    .map((c) => c.charCodeAt(0));
  return new Uint8Array(octets);
}