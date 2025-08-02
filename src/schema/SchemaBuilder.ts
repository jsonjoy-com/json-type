import type * as _ from './schema';

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

  public Boolean(id: string, options?: Omit<_.NoT<_.BoolSchema>, 'id'>): _.BoolSchema;
  public Boolean(options?: _.NoT<_.BoolSchema>): _.BoolSchema;
  public Boolean(a?: string | _.NoT<_.BoolSchema>, b?: _.NoT<_.BoolSchema> | void): _.BoolSchema {
    if (typeof a === 'string') return this.Boolean({id: a, ...(b || {})});
    return {kind: 'bool', ...(a || {})};
  }

  public Number(options?: _.NoT<_.NumSchema>): _.NumSchema {
    return {kind: 'num', ...options};
  }

  public String(id: string, options?: _.NoT<_.StrSchema>): _.StrSchema;
  public String(options?: _.NoT<_.StrSchema>): _.StrSchema;
  public String(a?: string | _.NoT<_.StrSchema>, b?: _.NoT<_.StrSchema>): _.StrSchema {
    if (typeof a === 'string') return this.String({id: a, ...(b || {})});
    return {kind: 'str', ...(a || {})};
  }

  // public Binary<T extends Schema>(options: Optional<BinarySchema<T>> & Pick<BinarySchema<T>, 'type'>): BinarySchema<T>;
  public Binary<T extends _.Schema>(type: T, options: _.Optional<Omit<_.BinSchema, 'type'>> = {}): _.BinSchema<T> {
    return {
      kind: 'bin',
      type,
      ...options,
    };
  }

  public Array<T extends _.Schema>(
    id: string,
    type: T,
    options?: Omit<_.NoT<_.ArrSchema<T, [], []>>, 'id' | 'type'>,
  ): _.ArrSchema<T>;
  public Array<T extends _.Schema>(type: T, options?: Omit<_.NoT<_.ArrSchema<T>>, 'type'>): _.ArrSchema<T, [], []>;
  public Array<T extends _.Schema>(
    a: string | T,
    b?: T | Omit<_.NoT<_.ArrSchema<T>>, 'type'>,
    c?: Omit<_.NoT<_.ArrSchema<T>>, 'id' | 'type'>,
  ): _.ArrSchema<T, [], []> {
    if (typeof a === 'string') return this.Array(b as T, {id: a, ...(c || {})});
    return {
      kind: 'arr',
      ...(b as Omit<_.NoT<_.ArrSchema<T>>, 'id' | 'type'>),
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
    value: _.Narrow<V>,
    options?: _.Optional<_.ConSchema<V>>,
  ): _.ConSchema<
    string extends V ? never : number extends V ? never : boolean extends V ? never : any[] extends V ? never : V
  > {
    return {kind: 'con', value: value as any, ...options};
  }

  public Tuple<const Head extends _.Schema[], T extends _.Schema, const Tail extends [] | _.Schema[]>(head: Head, type?: T, tail?: Tail): _.ArrSchema<T, Head, Tail> {
    const schema: _.ArrSchema<T, Head, Tail> =  {kind: 'arr', head};
    if (type) schema.type = type;
    if (tail) schema.tail = tail;
    return schema;
  }

  public fields<F extends _.ObjFieldSchema<any, any>[]>(...fields: _.ObjSchema<F>['fields']): F {
    return fields;
  }

  public Object<F extends _.ObjFieldSchema<string, _.Schema>[] | readonly _.ObjFieldSchema<string, _.Schema>[]>(
    options: _.NoT<_.ObjSchema<F>>,
  ): _.ObjSchema<F>;
  public Object<F extends _.ObjFieldSchema<string, _.Schema>[] | readonly _.ObjFieldSchema<string, _.Schema>[]>(
    fields: _.ObjSchema<F>['fields'],
    options?: _.Optional<_.ObjSchema<F>>,
  ): _.ObjSchema<F>;
  public Object<F extends _.ObjFieldSchema<string, _.Schema>[] | readonly _.ObjFieldSchema<string, _.Schema>[]>(
    ...fields: _.ObjSchema<F>['fields']
  ): _.ObjSchema<F>;
  public Object<F extends _.ObjFieldSchema<string, _.Schema>[] | readonly _.ObjFieldSchema<string, _.Schema>[]>(
    ...args: unknown[]
  ): _.ObjSchema<F> {
    const first = args[0];
    if (
      args.length === 1 &&
      first &&
      typeof first === 'object' &&
      (first as _.NoT<_.ObjSchema<F>>).fields instanceof Array
    )
      return {kind: 'obj', ...(first as _.NoT<_.ObjSchema<F>>)};
    if (args.length >= 1 && args[0] instanceof Array)
      return this.Object({
        fields: args[0] as F,
        ...(args[1] as _.Optional<_.ObjSchema<F>>),
      });
    return this.Object({fields: args as F});
  }

  /** @deprecated Use `.prop`. */
  public Field<K extends string, V extends _.Schema>(
    key: K,
    value: V,
    options: Omit<_.NoT<_.ObjFieldSchema<K, V>>, 'key' | 'value' | 'optional'> = {},
  ): _.ObjFieldSchema<K, V> {
    return {
      kind: 'field',
      key,
      value,
      ...options,
    };
  }

  /** @deprecated Use `.propOpt`. */
  public FieldOpt<K extends string, V extends _.Schema>(
    key: K,
    value: V,
    options: Omit<_.NoT<_.ObjFieldSchema<K, V>>, 'key' | 'value' | 'optional'> = {},
  ): _.ObjOptionalFieldSchema<K, V> {
    return {
      kind: 'field',
      key,
      value,
      ...options,
      optional: true,
    };
  }

  /** Declares an object property. */
  public prop<K extends string, V extends _.Schema>(
    key: K,
    value: V,
    options: Omit<_.NoT<_.ObjFieldSchema<K, V>>, 'key' | 'value' | 'optional'> = {},
  ): _.ObjFieldSchema<K, V> {
    return {
      kind: 'field',
      key,
      value,
      ...options,
    };
  }

  /** Declares an optional object property. */
  public propOpt<K extends string, V extends _.Schema>(
    key: K,
    value: V,
    options: Omit<_.NoT<_.ObjFieldSchema<K, V>>, 'key' | 'value' | 'optional'> = {},
  ): _.ObjOptionalFieldSchema<K, V> {
    return {
      kind: 'field',
      key,
      value,
      ...options,
      optional: true,
    };
  }

  public Map<V extends _.Schema, K extends _.Schema = _.StrSchema>(
    value: V,
    key?: K,
    options?: Omit<_.NoT<_.MapSchema<V, K>>, 'value' | 'key'>,
  ): _.MapSchema<V, K> {
    return {kind: 'map', value, ...(key && {key}), ...options};
  }

  public Any(options: _.NoT<_.AnySchema> = {}): _.AnySchema {
    return {
      kind: 'any',
      ...options,
    };
  }

  public Ref<T extends _.TType = any>(ref: string): _.RefSchema<T> {
    return {
      kind: 'ref',
      ref: ref as string & T,
    };
  }

  public Or<T extends _.Schema[]>(...types: T): _.OrSchema<T> {
    return {
      kind: 'or',
      types,
      discriminator: ['num', -1],
    };
  }

  public Function<Req extends _.Schema, Res extends _.Schema>(req: Req, res: Res): _.FnSchema<Req, Res> {
    return {
      kind: 'fn',
      req,
      res,
    };
  }

  public Function$<Req extends _.Schema, Res extends _.Schema>(req: Req, res: Res): _.FnStreamingSchema<Req, Res> {
    return {
      kind: 'fn$',
      req,
      res,
    };
  }
}
