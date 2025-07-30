import type * as schema from '../schema';
import type * as classes from './classes';

export type * from './classes';

export interface BaseType<S extends schema.TType> {
  getSchema(): S;
}

export type Type =
  | classes.AnyType
  | classes.ConType<any>
  | classes.BoolType
  | classes.NumType
  | classes.StrType
  | classes.BinType<any>
  | classes.ArrType<any>
  | classes.TupType<any>
  | classes.ObjType<any>
  | classes.MapType<any>
  | classes.RefType<any>
  | classes.OrType<any>
  | classes.FnType<any, any, any>
  | classes.FnRxType<any, any, any>;

export type SchemaOf<T extends Type | Type[]> = T extends BaseType<infer U> ? U : never;
export type SchemaOfMap<M extends Record<string, Type>> = {
  [K in keyof M]: SchemaOf<M[K]>;
};

export type SchemaOfObjectFieldType<F> = F extends classes.ObjectOptionalFieldType<infer K, infer V>
  ? schema.ObjectOptionalFieldSchema<K, SchemaOf<V>>
  : F extends classes.ObjectFieldType<infer K, infer V>
    ? schema.ObjectFieldSchema<K, SchemaOf<V>>
    : never;

export type SchemaOfObjectFields<F> = {
  [K in keyof F]: SchemaOfObjectFieldType<F[K]>;
};

export type TypeMap = {[name: string]: schema.Schema};

export type FilterFunctions<T> = {
  [K in keyof T as T[K] extends classes.FnType<any, any, any>
    ? K
    : T[K] extends classes.FnRxType<any, any, any>
      ? K
      : never]: T[K] extends classes.FnType<any, any, any>
    ? T[K]
    : T[K] extends classes.FnRxType<any, any, any>
      ? T[K]
      : never;
};
