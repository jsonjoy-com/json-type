import type {FunctionType} from '../type/classes/FunctionType';

export function randomFunction(type: FunctionType<any, any>): unknown {
  return async () => type.res.random();
}