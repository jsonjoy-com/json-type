import type {NumberType} from '../type/classes/NumberType';

export function randomNumber(type: NumberType): number {
  let num = Math.random();
  let min = Number.MIN_SAFE_INTEGER;
  let max = Number.MAX_SAFE_INTEGER;
  const schema = type.getSchema();
  if (schema.gt !== undefined) min = schema.gt;
  if (schema.gte !== undefined) min = schema.gte + 0.000000000000001;
  if (schema.lt !== undefined) max = schema.lt;
  if (schema.lte !== undefined) max = schema.lte - 0.000000000000001;
  if (schema.format) {
    switch (schema.format) {
      case 'i8':
        min = Math.max(min, -0x80);
        max = Math.min(max, 0x7f);
        break;
      case 'i16':
        min = Math.max(min, -0x8000);
        max = Math.min(max, 0x7fff);
        break;
      case 'i32':
        min = Math.max(min, -0x80000000);
        max = Math.min(max, 0x7fffffff);
        break;
      case 'i64':
      case 'i':
        min = Math.max(min, -0x8000000000);
        max = Math.min(max, 0x7fffffffff);
        break;
      case 'u8':
        min = Math.max(min, 0);
        max = Math.min(max, 0xff);
        break;
      case 'u16':
        min = Math.max(min, 0);
        max = Math.min(max, 0xffff);
        break;
      case 'u32':
        min = Math.max(min, 0);
        max = Math.min(max, 0xffffffff);
        break;
      case 'u64':
      case 'u':
        min = Math.max(min, 0);
        max = Math.min(max, 0xffffffffffff);
        break;
    }
    return Math.round(num * (max - min)) + min;
  }
  num = num * (max - min) + min;
  if (Math.random() > 0.7) num = Math.round(num);
  if (num === 0) return 0;
  return num;
}