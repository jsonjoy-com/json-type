import type {TupleType} from '../type/classes/TupleType';

export function randomTuple(type: TupleType<any>): unknown[] {
  return (type as any).types.map((subType: any) => subType.random());
}