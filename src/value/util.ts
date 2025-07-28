import {Value} from './Value';
import {ObjectValue} from './ObjectValue';
import * as classes from '../type';

export const value: {
  <T extends classes.ObjType>(type: T, data: unknown): ObjectValue<T>;
  <T extends classes.Type>(type: T, data: unknown): Value<T>;
} = (type: any, data: any): any => {
  if (type instanceof classes.ObjType) return new ObjectValue(type as classes.ObjType, <any>data);
  return new Value(type as classes.Type, <any>data);
};
