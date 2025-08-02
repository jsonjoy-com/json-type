import type {
  BoolSchema,
  NumSchema,
  StrSchema,
  ArrSchema,
  ObjSchema,
  ObjFieldSchema,
  MapSchema,
  NoT,
  BinSchema,
  AnySchema,
  RefSchema,
  OrSchema,
  Schema,
  ObjOptionalFieldSchema,
  Optional,
  ConSchema,
  TupSchema,
  FnSchema,
  FnStreamingSchema,
  TType,
  Narrow,
} from '.';

export class SchemaBuilder {
  get str() {
    return this.String();
  }

  get num() {
    return this.Number();
  }

  get bool() {
    return this.Boolean();
  }

  get undef() {
    return this.Const<undefined>(undefined);
  }

  get nil() {
    return this.Const<null>(null);
  }

  get arr() {
    return this.Array(this.any);
  }

  get obj() {
    return this.Object();
  }

  get map() {
    return this.Map(this.any);
  }

  get bin() {
    return this.Binary(this.any);
  }

  get any() {
    return this.Any();
  }

  get fn() {
    return this.Function(this.any, this.any);
  }

  get fn$() {
    return this.Function$(this.any, this.any);
  }

  public Boolean(id: string, options?: Omit<NoT<BoolSchema>, 'id'>): BoolSchema;
  public Boolean(options?: NoT<BoolSchema>): BoolSchema;
  public Boolean(a?: string | NoT<BoolSchema>, b?: NoT<BoolSchema> | void): BoolSchema {
    if (typeof a === 'string') return this.Boolean({id: a, ...(b || {})});
    return {kind: 'bool', ...(a || {})};
  }

  public Number(options?: NoT<NumSchema>): NumSchema {
    return {kind: 'num', ...options};
  }

  public String(id: string, options?: NoT<StrSchema>): StrSchema;
  public String(options?: NoT<StrSchema>): StrSchema;
  public String(a?: string | NoT<StrSchema>, b?: NoT<StrSchema>): StrSchema {
    if (typeof a === 'string') return this.String({id: a, ...(b || {})});
    return {kind: 'str', ...(a || {})};
  }

  // public Binary<T extends Schema>(options: Optional<BinarySchema<T>> & Pick<BinarySchema<T>, 'type'>): BinarySchema<T>;
  public Binary<T extends Schema>(type: T, options: Optional<Omit<BinSchema, 'type'>> = {}): BinSchema<T> {
    return {
      kind: 'bin',
      type,
      ...options,
    };
  }

  public Array<T extends Schema>(
    id: string,
    type: T,
    options?: Omit<NoT<ArrSchema<T>>, 'id' | 'type'>,
  ): ArrSchema<T>;
  public Array<T extends Schema>(type: T, options?: Omit<NoT<ArrSchema<T>>, 'type'>): ArrSchema<T>;
  public Array<T extends Schema>(
    a: string | T,
    b?: T | Omit<NoT<ArrSchema<T>>, 'type'>,
    c?: Omit<NoT<ArrSchema<T>>, 'id' | 'type'>,
  ): ArrSchema<T> {
    if (typeof a === 'string') return this.Array(b as T, {id: a, ...(c || {})});
    return {
      kind: 'arr',
      ...(b as Omit<NoT<ArrSchema<T>>, 'id' | 'type'>),
      type: a as T,
    };
  }

  /**
   * Use TypeScript const when defining a constant value.
   *
   *
   * @example
   *
   * ```ts
   * s.Const('foo' as const);
   * ```
   */
  public Const<V>(
    value: Narrow<V>,
    options?: Optional<ConSchema<V>>,
  ): ConSchema<
    string extends V ? never : number extends V ? never : boolean extends V ? never : any[] extends V ? never : V
  > {
    return {kind: 'con', value: value as any, ...options};
  }

  public Tuple<T extends Schema[]>(...types: T): TupSchema<T> {
    return {kind: 'tup', types};
  }

  public fields<F extends ObjFieldSchema<any, any>[]>(...fields: ObjSchema<F>['fields']): F {
    return fields;
  }

  public Object<F extends ObjFieldSchema<string, Schema>[] | readonly ObjFieldSchema<string, Schema>[]>(
    options: NoT<ObjSchema<F>>,
  ): ObjSchema<F>;
  public Object<F extends ObjFieldSchema<string, Schema>[] | readonly ObjFieldSchema<string, Schema>[]>(
    fields: ObjSchema<F>['fields'],
    options?: Optional<ObjSchema<F>>,
  ): ObjSchema<F>;
  public Object<F extends ObjFieldSchema<string, Schema>[] | readonly ObjFieldSchema<string, Schema>[]>(
    ...fields: ObjSchema<F>['fields']
  ): ObjSchema<F>;
  public Object<F extends ObjFieldSchema<string, Schema>[] | readonly ObjFieldSchema<string, Schema>[]>(
    ...args: unknown[]
  ): ObjSchema<F> {
    const first = args[0];
    if (
      args.length === 1 &&
      first &&
      typeof first === 'object' &&
      (first as NoT<ObjSchema<F>>).fields instanceof Array
    )
      return {kind: 'obj', ...(first as NoT<ObjSchema<F>>)};
    if (args.length >= 1 && args[0] instanceof Array)
      return this.Object({
        fields: args[0] as F,
        ...(args[1] as Optional<ObjSchema<F>>),
      });
    return this.Object({fields: args as F});
  }

  /** @deprecated Use `.prop`. */
  public Field<K extends string, V extends Schema>(
    key: K,
    value: V,
    options: Omit<NoT<ObjFieldSchema<K, V>>, 'key' | 'value' | 'optional'> = {},
  ): ObjFieldSchema<K, V> {
    return {
      kind: 'field',
      key,
      value,
      ...options,
    };
  }

  /** @deprecated Use `.propOpt`. */
  public FieldOpt<K extends string, V extends Schema>(
    key: K,
    value: V,
    options: Omit<NoT<ObjFieldSchema<K, V>>, 'key' | 'value' | 'optional'> = {},
  ): ObjOptionalFieldSchema<K, V> {
    return {
      kind: 'field',
      key,
      value,
      ...options,
      optional: true,
    };
  }

  /** Declares an object property. */
  public prop<K extends string, V extends Schema>(
    key: K,
    value: V,
    options: Omit<NoT<ObjFieldSchema<K, V>>, 'key' | 'value' | 'optional'> = {},
  ): ObjFieldSchema<K, V> {
    return {
      kind: 'field',
      key,
      value,
      ...options,
    };
  }

  /** Declares an optional object property. */
  public propOpt<K extends string, V extends Schema>(
    key: K,
    value: V,
    options: Omit<NoT<ObjFieldSchema<K, V>>, 'key' | 'value' | 'optional'> = {},
  ): ObjOptionalFieldSchema<K, V> {
    return {
      kind: 'field',
      key,
      value,
      ...options,
      optional: true,
    };
  }

  public Map<V extends Schema, K extends Schema = StrSchema>(
    value: V,
    key?: K,
    options?: Omit<NoT<MapSchema<V, K>>, 'value' | 'key'>,
  ): MapSchema<V, K> {
    return {kind: 'map', value, ...(key && {key}), ...options};
  }

  public Any(options: NoT<AnySchema> = {}): AnySchema {
    return {
      kind: 'any',
      ...options,
    };
  }

  public Ref<T extends TType = any>(ref: string): RefSchema<T> {
    return {
      kind: 'ref',
      ref: ref as string & T,
    };
  }

  public Or<T extends Schema[]>(...types: T): OrSchema<T> {
    return {
      kind: 'or',
      types,
      discriminator: ['num', -1],
    };
  }

  public Function<Req extends Schema, Res extends Schema>(req: Req, res: Res): FnSchema<Req, Res> {
    return {
      kind: 'fn',
      req,
      res,
    };
  }

  public Function$<Req extends Schema, Res extends Schema>(req: Req, res: Res): FnStreamingSchema<Req, Res> {
    return {
      kind: 'fn$',
      req,
      res,
    };
  }
}
