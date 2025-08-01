export * from './types';
export * from './classes';

import {TypeBuilder} from './TypeBuilder';
import type {TypeOf} from '../schema';
import type {SchemaOf, Type} from './types';

export const t = new TypeBuilder();

export namespace t {
  export type infer<T extends Type | Type[]> = TypeOf<SchemaOf<T>>;
}
