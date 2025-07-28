import {RandomJson} from '@jsonjoy.com/util/lib/json-random';
import {cloneBinary} from '@jsonjoy.com/util/lib/json-clone';
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

export const any = (type: AnyType): unknown => {
  return RandomJson.generate({nodeCount: 5});
};

export const arr = (type: ArrType<any>): unknown[] => {
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
};

export const bin = (type: BinType<any>): Uint8Array => {
  const octets = RandomJson.genString()
    .split('')
    .map((c) => c.charCodeAt(0));
  return new Uint8Array(octets);
};

export const bool = (type: BoolType): boolean => {
  return RandomJson.genBoolean();
};

export const const_ = (type: ConType): unknown => {
  return cloneBinary(type.getSchema().value);
};

export const fn = (type: FnType<any, any>): unknown => {
  return async () => type.res.random();
};

export const map = (type: MapType<any>): Record<string, unknown> => {
  const length = Math.round(Math.random() * 10);
  const res: Record<string, unknown> = {};
  for (let i = 0; i < length; i++) {
    res[RandomJson.genString(length)] = (type as any).valueType.random();
  }
  return res;
};

export const num = (type: NumType): number => {
  let num = Math.random();
  let min = Number.MIN_SAFE_INTEGER;
  let max = Number.MAX_SAFE_INTEGER;
  const schema = type.getSchema();
  const {lt, lte, gt, gte} = schema;
  if (gt !== undefined) min = gt;
  if (gte !== undefined)
    if (gte === lte) return gte;
    else min = gte + 0.000000000000001;
  if (lt !== undefined) max = lt;
  if (lte !== undefined) max = lte - 0.000000000000001;
  if (min >= max) return max;
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
};

export const obj = (type: ObjType<any>): Record<string, unknown> => {
  const schema = type.getSchema();
  const obj: Record<string, unknown> = schema.unknownFields ? <Record<string, unknown>>RandomJson.genObject() : {};
  // Use runtime check to avoid circular import with ObjectOptionalFieldType
  for (const field of (type as any).fields) {
    if (field.constructor.name === 'ObjectOptionalFieldType') if (Math.random() > 0.5) continue;
    obj[field.key] = field.value.random();
  }
  return obj;
};

export const or = (type: OrType<any>): unknown => {
  const types = (type as any).types;
  const index = Math.floor(Math.random() * types.length);
  return types[index].random();
};

export const ref = (type: RefType<any>): unknown => {
  if (!type.system) throw new Error('NO_SYSTEM');
  const alias = type.system.resolve(type.getSchema().ref);
  return alias.type.random();
};

export const str = (type: StrType): string => {
  let length = Math.round(Math.random() * 10);
  const schema = type.getSchema();
  const {min, max} = schema;
  if (min !== undefined && length < min) length = min + length;
  if (max !== undefined && length > max) length = max;
  return RandomJson.genString(length);
};

export const tup = (type: TupType<any>): unknown[] => {
  return (type as any).types.map((subType: any) => subType.random());
};
