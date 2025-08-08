import type {Observable} from 'rxjs';
import type {Mutable} from '@jsonjoy.com/util/lib/types';
import type {Display, Identifiable} from './common';
import type {Expr} from '@jsonjoy.com/json-expression';

export interface TType<Value = unknown> extends Display, Partial<Identifiable> {
  /**
   * The type of the JSON Type node.
   */
  kind: string;

  /**
   * Custom metadata that can be attached to the type. This is useful for
   * documentation generation, and for custom code generators. The `meta` field
   * is not used by the JSON Type system itself.
   */
  meta?: Record<string, unknown>;

  /**
   * Default value for this type. This may be used when the value is not provided
   * during validation or serialization. The default value should match the
   * type of this schema node.
   */
  default?: Value;

  /**
   * List of example usages of this type.
   */
  examples?: TExample<Value>[];

  /**
   * A flag that indicates that this type is deprecated. When a type is
   * deprecated, it should not be used in new code, and existing code should be
   * updated to use a non-deprecated type.
   */
  deprecated?: {
    /**
     * A message that explains why the type is deprecated, and what to use
     * instead.
     */
    description?: string;
  };
}

/**
 * An example of how a value of a given type could look like.
 */
export interface TExample<Value = unknown> extends Display {
  value: Value;
}

/**
 * Represents something of which type is not known.
 *
 * Example:
 *
 * ```json
 * {
 *   "kind": "any",
 *   "metadata": {
 *     "description": "Any type"
 *   }
 * }
 * ```
 */
export interface AnySchema extends TType<unknown> {
  kind: 'any';

  /**
   * Custom metadata that can be attached to the type. This is useful for
   * documentation generation, and for custom code generators.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Represents a constant value.
 * Example:
 * ```json
 * {
 *   "kind": "con",
 *   "value": 42
 * }
 * ```
 */
export interface ConSchema<V = any> extends TType {
  kind: 'con';
  /** The value. */
  value: V;
}

/**
 * Represents a JSON boolean.
 *
 * Example:
 *
 * ```json
 * {
 *   "kind": "bool",
 *   "meta": {
 *     "description": "A boolean value"
 *   }
 * }
 * ```
 */
export interface BoolSchema extends TType<boolean> {
  kind: 'bool';
}

/**
 * Represents a JSON number.
 *
 * Example:
 *
 * ```json
 * {
 *   "kind": "num",
 *   "format": "i32",
 *   "gte": 0,
 *   "lte": 100
 * }
 * ```
 */
export interface NumSchema extends TType<number> {
  kind: 'num';

  /**
   * A more specific format of the number. When this is set, faster compiled
   * serialization functions can generate. "i" stands for signed integer, "u"
   * for unsigned integer, and "f" for float.
   *
   * - "i" is signed integer.
   * - "i8" is 8-bit signed integer.
   * - "i16" is 16-bit signed integer.
   * - "i32" is 32-bit signed integer.
   * - "i64" is 64-bit signed integer.
   * - "u" is unsigned integer.
   * - "u8" is 8-bit unsigned integer.
   * - "u16" is 16-bit unsigned integer.
   * - "u32" is 32-bit unsigned integer.
   * - "u64" is 64-bit unsigned integer.
   * - "f" is float.
   * - "f32" is 32-bit float.
   * - "f64" is 64-bit float.
   */
  format?: 'i' | 'u' | 'f' | 'i8' | 'i16' | 'i32' | 'i64' | 'u8' | 'u16' | 'u32' | 'u64' | 'f32' | 'f64';

  /** Minimum value. */
  gt?: number;

  /** Minimum value, inclusive. */
  gte?: number;

  /** Maximum value. */
  lt?: number;

  /** Maximum value, inclusive. */
  lte?: number;
}

/**
 * Represents a JSON string.
 *
 * Example:
 *
 * ```json
 * {
 *   "kind": "str",
 *   "format": "utf8",
 *   "min": 1,
 *   "max": 255
 * }
 * ```
 */
export interface StrSchema extends TType<string> {
  kind: 'str';

  /**
   * String format specification. When set, the string value will be validated
   * according to the specified format for maximum performance.
   *
   * - "ascii" - Only ASCII characters (0-127) are allowed
   * - "utf8" - Valid UTF-8 encoded strings are allowed
   */
  format?: 'ascii' | 'utf8';

  /**
   * When set to true, means that the string can contain only ASCII characters.
   * This enables a range of optimizations, such as using a faster JSON
   * serialization, faster binary serialization.
   *
   * @deprecated Use `format: 'ascii'` instead.
   */
  ascii?: boolean;

  /**
   * When set to `true`, a faster JSON serialization function can be
   * generated, which does not escape special JSON string characters.
   * See: https://www.json.org/json-en.html
   */
  noJsonEscape?: boolean;

  /** Minimum number of characters. */
  min?: number;

  /** Maximum number of characters. */
  max?: number;
}

/**
 * Represents a binary type.
 *
 * Example:
 *
 * ```json
 * {
 *   "kind": "bin",
 *   "type": {
 *     "kind": "str"
 *   },
 *   "format": "json",
 *   "min": 10,
 *   "max": 1024
 * }
 * ```
 */
export interface BinSchema<T extends TType = any> extends TType {
  kind: 'bin';

  /** Type of value encoded in the binary data. */
  type: T;

  /** Codec used for encoding the binary data. */
  format?: 'json' | 'cbor' | 'msgpack' | 'resp3' | 'ion' | 'bson' | 'ubjson' | 'bencode';

  /** Minimum size in octets. */
  min?: number;

  /** Maximum size in octets. */
  max?: number;
}

/**
 * Represents a JSON array.
 *
 * Example:
 *
 * ```json
 * {
 *   "kind": "arr",
 *   "type": {
 *     "kind": "num"
 *   },
 *   "min": 1,
 *   "max": 10
 * }
 * ```
 */
export interface ArrSchema<T extends TType = any, Head extends TType[] = any, Tail extends TType[] = any>
  extends TType<Array<unknown>> {
  kind: 'arr';
  /** One or more "one-of" types that array contains. */
  type?: T;
  /** Head tuple types. */
  head?: Head;
  /** Tail tuple types. */
  tail?: Tail;
  /** Minimum number of elements. */
  min?: number;
  /** Maximum number of elements. */
  max?: number;
}

/**
 * Represents a JSON object type, the "object" type excluding "null" in JavaScript,
 * the "object" type in JSON Schema, and the "obj" type in MessagePack.
 * Example:
 * ```json
 * {
 *   "kind": "obj",
 *   "keys": [
 *     {
 *       "kind": "key",
 *       "key": "name",
 *       "type": {
 *         "kind": "str"
 *       },
 *       "optional": false
 *     },
 *     {
 *       "kind": "key",
 *       "key": "age",
 *       "type": {
 *         "kind": "num",
 *         "gte": 0
 *       },
 *       "optional": true
 *     }
 *   ],
 *   "decodeUnknownKeys": false
 * }
 * ```
 */
export interface ObjSchema<Keys extends ObjKeySchema<string, TType>[] | readonly ObjKeySchema<string, TType>[] = any>
  extends TType<object> {
  kind: 'obj';

  /**
   * Sorted list of keys this object contains. Although object keys in JSON
   * are not guaranteed to be in any particular order, this list is sorted so
   * that the order of keys is consistent when generating documentation or code.
   */
  keys: Keys;

  /**
   * Whether the object may have keys that are not explicitly defined in the
   * "keys" list. This setting is similar to "additionalProperties" in JSON
   * Schema. Defaults to false.
   *
   * To define an object with of unknown shape use the following annotation:
   *
   * ```json
   * {
   *   "kind": "obj",
   *   "keys": [],
   *   "decodeUnknownKeys": true
   * }
   * ```
   */
  decodeUnknownKeys?: boolean;

  encodeUnknownKeys?: boolean;
}

/**
 * Represents a single field of an object.
 *
 * @todo Rename to `key`.
 */
export interface ObjKeySchema<K extends string = string, V extends TType = TType> extends TType<[K, V]>, Display {
  kind: 'key';
  /** Key name of the field. */
  key: K;

  /**
   * Type of the field value.
   */
  value: V;

  optional?: boolean;
}

export interface ObjOptKeySchema<K extends string = string, V extends TType = TType> extends ObjKeySchema<K, V> {
  optional: true;
}

/**
 * Represents an object, which is treated as a map. All keys are strings and all
 * values are of the same type.
 */
export interface MapSchema<V extends TType = any, K extends TType = any> extends TType<Record<string, unknown>> {
  kind: 'map';
  /**
   * Type of all keys in the map. Defaults to string type.
   */
  key?: K;
  /**
   * Type of all values in the map.
   */
  value: V;
}

/**
 * Reference to another type.
 */
export interface RefSchema<T extends TType = TType> extends TType {
  kind: 'ref';

  /** ID of the type it references. */
  ref: string & T;
}

/**
 * Represents a type that is one of a set of types.
 */
export interface OrSchema<T extends TType[] = TType[]> extends TType {
  kind: 'or';

  /** One or more "one-of" types. */
  types: T;

  discriminator: Expr;
}

export type FunctionValue<Req, Res, Ctx = unknown> = (req: Req, ctx?: Ctx) => Res | Promise<Res>;

export interface FnSchema<Req extends TType = TType, Res extends TType = TType, Ctx = unknown> extends TType {
  kind: 'fn';
  req: Req;
  res: Res;
  __ctx_brand?: Ctx;
}

export type FnStreamingValue<Req, Res, Ctx = unknown> = (req: Observable<Req>, ctx?: Ctx) => Observable<Res>;

export interface FnStreamingSchema<Req extends TType = TType, Res extends TType = TType, Ctx = unknown> extends TType {
  /** @todo Rename to `fn`. Make it a property on the schema instead. */
  kind: 'fn$';
  req: Req;
  res: Res;
  __ctx_brand?: Ctx;
}

export interface TypeSystemSchema {
  // biome-ignore lint: fix this at some point...
  types: {
    // [alias: string]:
  };
}

/**
 * Any valid JSON type.
 */
export type JsonSchema =
  | BoolSchema
  | NumSchema
  | StrSchema
  | BinSchema
  | ArrSchema
  | ConSchema
  | ObjSchema
  | ObjKeySchema
  | ObjOptKeySchema
  | MapSchema;

export type Schema = JsonSchema | RefSchema | OrSchema | AnySchema | FnSchema | FnStreamingSchema;

export type NoT<T extends TType> = Omit<T, 'kind'>;

export type TypeOf<T> = T extends OrSchema<any>
  ? TypeOfValue<T['types'][number]>
  : T extends RefSchema<infer U>
    ? TypeOf<U>
    : T extends AnySchema
      ? unknown
      : TypeOfValue<T>;

export type TypeOfValue<T> = T extends BoolSchema
  ? boolean
  : T extends NumSchema
    ? number
    : T extends StrSchema
      ? string
      : T extends ArrSchema<infer U, infer Head, infer Tail>
        ? [
            ...{[K in keyof Head]: TypeOf<Head[K]>},
            ...(Schema extends U ? [] : TypeOf<U>[]),
            ...(Tail extends JsonSchema[] ? {[K in keyof Tail]: TypeOf<Tail[K]>} : []),
          ]
        : T extends ConSchema<infer U>
          ? U
          : T extends ObjSchema<infer F>
            ? NoEmptyInterface<TypeFields<Mutable<F>>>
            : T extends MapSchema<infer U>
              ? Record<string, TypeOf<U>>
              : T extends BinSchema
                ? Uint8Array
                : T extends FnSchema<infer Req, infer Res, infer Ctx>
                  ? (req: TypeOf<Req>, ctx: Ctx) => UndefToVoid<TypeOf<Res>> | Promise<UndefToVoid<TypeOf<Res>>>
                  : T extends FnStreamingSchema<infer Req, infer Res, infer Ctx>
                    ? (req$: Observable<TypeOf<Req>>, ctx: Ctx) => Observable<UndefToVoid<TypeOf<Res>>>
                    : never;

export type TypeOfMap<M extends Record<string, Schema>> = {
  [K in keyof M]: TypeOf<M[K]>;
};

type TypeFields<F> = TypeOfFieldMap<FieldsAdjustedForOptional<ToObject<{[K in keyof F]: ObjectFieldToTuple<F[K]>}>>>;

type ToObject<T> = T extends [string, unknown][] ? {[K in T[number] as K[0]]: K[1]} : never;

type ObjectFieldToTuple<F> = F extends ObjKeySchema<infer K, infer V> ? [K, F] : never;

type NoEmptyInterface<I> = keyof I extends never ? Record<string, never> : I;

type OptionalFields<T> = {
  [K in keyof T]-?: T[K] extends ObjOptKeySchema ? K : never;
}[keyof T];

type RequiredFields<T> = Exclude<keyof T, OptionalFields<T>>;

type FieldsAdjustedForOptional<T> = Pick<T, RequiredFields<T>> & Partial<Pick<T, OptionalFields<T>>>;

type TypeOfFieldMap<T> = {[K in keyof T]: TypeOf<FieldValue<T[K]>>};

type FieldValue<F> = F extends ObjKeySchema<any, infer V> ? V : never;

type UndefToVoid<T> = T extends undefined ? void : T;

export type OptionalProps<T extends object> = Exclude<
  {
    [K in keyof T]: T extends Record<K, T[K]> ? never : K;
  }[keyof T],
  undefined
>;

export type Optional<T extends object> = Pick<T, OptionalProps<T>>;
export type Required<T extends object> = Omit<T, OptionalProps<T>>;

export type Narrow<T> =
  | (T extends infer U ? U : never)
  | Extract<T, number | string | boolean | bigint | symbol | null | undefined | []>
  | ([T] extends [[]] ? [] : {[K in keyof T]: Narrow<T[K]>});
