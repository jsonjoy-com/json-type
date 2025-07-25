import type {OrType} from '../type/classes/OrType';

export function randomOr(type: OrType<any>): unknown {
  const types = (type as any).types;
  const index = Math.floor(Math.random() * types.length);
  return types[index].random();
}