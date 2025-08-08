import {Value} from './Value';
import {ObjValue} from './ObjValue';
import type * as classes from '../type';

export const value: {
  <T extends classes.ObjType>(type: T, data: unknown): ObjValue<T>;
  <T extends classes.Type>(type: T, data: unknown): Value<T>;
} = (type: any, data: any): any => {
  if (type.kind() === 'obj') return new ObjValue(type as classes.ObjType, <any>data);
  return new Value(type as classes.Type, <any>data);
};
