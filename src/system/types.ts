import type {Schema, TypeOf} from '../schema';
import type {SchemaOf, Type} from '../type';
import type {AliasType} from './TypeAlias';

export type TypeOfAlias<T> = T extends AliasType<any, infer T> ? T : T extends Type ? T : never;

export type ResolveType<T> = T extends AliasType<any, infer T>
  ? TypeOf<SchemaOf<T>>
  : T extends Type
    ? TypeOf<SchemaOf<T>>
    : T extends Schema
      ? TypeOf<T>
      : never;

export type infer<T> = ResolveType<T>;
