import {RandomJson} from '@jsonjoy.com/util/lib/json-random';
import type {StringType} from '../type/classes/StringType';

export function randomString(type: StringType): string {
  let length = Math.round(Math.random() * 10);
  const schema = type.getSchema();
  const {min, max} = schema;
  if (min !== undefined && length < min) length = min + length;
  if (max !== undefined && length > max) length = max;
  return RandomJson.genString(length);
}