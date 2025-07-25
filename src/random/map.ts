import {RandomJson} from '@jsonjoy.com/util/lib/json-random';
import type {MapType} from '../type/classes/MapType';

export function randomMap(type: MapType<any>): Record<string, unknown> {
  const length = Math.round(Math.random() * 10);
  const res: Record<string, unknown> = {};
  for (let i = 0; i < length; i++) {
    res[RandomJson.genString(length)] = (type as any).type.random();
  }
  return res;
}