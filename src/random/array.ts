import type {ArrayType} from '../type/classes/ArrayType';

export function randomArray(type: ArrayType<any>): unknown[] {
  let length = Math.round(Math.random() * 10);
  const schema = type.getSchema();
  const {min, max} = schema;
  if (min !== undefined && length < min) length = min + length;
  if (max !== undefined && length > max) length = max;
  const result: unknown[] = [];
  for (let i = 0; i < length; i++) {
    result.push((type as any).type.random());
  }
  return result;
}