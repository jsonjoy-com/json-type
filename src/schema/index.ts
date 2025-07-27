import {TypeOf} from './schema';
import {SchemaBuilder} from './SchemaBuilder';

export * from './common';
export * from './schema';

/**
 * JSON Type default AST builder.
 */
export const s = new SchemaBuilder();

export namespace s {
  export type infer<T> = TypeOf<T>;
}
