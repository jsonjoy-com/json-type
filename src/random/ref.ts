import type {RefType} from '../type/classes/RefType';

export function randomRef(type: RefType<any>): unknown {
  if (!type.system) throw new Error('NO_SYSTEM');
  const alias = type.system.resolve(type.getSchema().ref);
  return alias.type.random();
}