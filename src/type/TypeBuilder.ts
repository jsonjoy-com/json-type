import * as schema from '../schema';
import * as classes from './classes';
import type {Type} from './types';
import type {TypeSystem} from '../system/TypeSystem';
import type {TypeAlias} from '../system/TypeAlias';
import type {TypeOfAlias} from '../system/types';

const {s} = schema;

type UnionToIntersection<U> = (
  U extends never ? never : (arg: U) => never
) extends (arg: infer I) => void
  ? I
  : never;

type UnionToTuple<T> = UnionToIntersection<
  T extends never ? never : (t: T) => T
> extends (_: never) => infer W
  ? [...UnionToTuple<Exclude<T, W>>, W]
  : [];

type ObjValueTuple<T, KS extends any[] = UnionToTuple<keyof T>, R extends any[] = []> =
  KS extends [infer K, ...infer KT]
  ? ObjValueTuple<T, KT, [...R, T[K & keyof T]]>
  : R

type RecordToFields<O extends Record<string, Type>> = ObjValueTuple<{[K in keyof O]: classes.ObjectFieldType<K extends string ? K : never, O[K]>}>;

export class TypeBuilder {
  constructor(public system?: TypeSystem) {}

  get any() {
    return this.Any();
  }

  get undef() {
    return this.Const<undefined>(undefined);
  }

  get nil() {
    return this.Const<null>(null);
  }

  get bool() {
    return this.Boolean();
  }

  get num() {
    return this.Number();
  }

  get str() {
    return this.String();
  }

  get bin() {
    return this.Binary(this.any);
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

  get fn() {
    return this.Function(this.any, this.any);
  }

  get fn$() {
    return this.Function$(this.any, this.any);
  }

  public readonly undefined = () => this.undef;
  public readonly null = () => this.nil;
  public readonly boolean = () => this.bool;
  public readonly number = () => this.num;
  // public readonly bigint = () => this.Number({format: 'i64'});
  public readonly string = () => this.str;
  public readonly binary = () => this.bin;

  public readonly literal = <V>(value: schema.Narrow<V>, options?: schema.Optional<schema.ConstSchema>) =>
    this.Const(value, options);

  public readonly array = <T>(type?: T, options?: schema.Optional<schema.ArraySchema>) =>
    this.Array<T extends Type ? T : classes.AnyType>((type ?? this.any) as T extends Type ? T : classes.AnyType, options);

  public readonly tuple = <F extends Type[]>(...types: F) => this.Tuple(...types);

  public readonly object = <R extends Record<string, Type>>(record: R): classes.ObjectType<RecordToFields<R>> => {
    const fields: classes.ObjectFieldType<any, any>[] = [];
    for (const [key, value] of Object.entries(record)) fields.push(this.prop(key, value));
    const obj = new classes.ObjectType<RecordToFields<R>>(fields as any);
    obj.system = this.system;
    return obj;
  };

  /**
   * Creates a type that represents a value that may be present or absent. The
   * value is `undefined` if absent. This is a shorthand for `t.Or(type, t.undef)`.
   */
  public readonly maybe = <T extends Type>(type: T) =>
    this.Or(type, this.undef);

  public Any(options?: schema.Optional<schema.AnySchema>) {
    const type = new classes.AnyType(s.Any(options));
    type.system = this.system;
    return type;
  }

  public Const<V>(value: schema.Narrow<V>, options?: schema.Optional<schema.ConstSchema>) {
    type V2 = string extends V
      ? never
      : number extends V
        ? never
        : boolean extends V
          ? never
          : any[] extends V
            ? never
            : V;
    const type = new classes.ConstType<V2>(schema.s.Const(value, options));
    type.system = this.system;
    return type;
  }

  public Boolean(options?: schema.Optional<schema.BooleanSchema>) {
    const type = new classes.BooleanType(s.Boolean(options));
    type.system = this.system;
    return type;
  }

  public Number(options?: schema.Optional<schema.NumberSchema>) {
    const type = new classes.NumberType(s.Number(options));
    type.system = this.system;
    return type;
  }

  public String(options?: schema.Optional<schema.StringSchema>) {
    const type = new classes.StringType(s.String(options));
    type.system = this.system;
    return type;
  }

  public Binary<T extends Type>(type: T, options: schema.Optional<schema.BinarySchema> = {}) {
    const bin = new classes.BinaryType(type, options);
    bin.system = this.system;
    return bin;
  }

  public Array<T extends Type>(type: T, options?: schema.Optional<schema.ArraySchema>) {
    const arr = new classes.ArrayType<T>(type, options);
    arr.system = this.system;
    return arr;
  }

  public Tuple<F extends Type[]>(...types: F) {
    const tup = new classes.TupleType<F>(types);
    tup.system = this.system;
    return tup;
  }

  public Object<F extends classes.ObjectFieldType<any, any>[]>(...fields: F) {
    const obj = new classes.ObjectType<F>(fields);
    obj.system = this.system;
    return obj;
  }

  public prop<K extends string, V extends Type>(key: K, value: V) {
    const field = new classes.ObjectFieldType<K, V>(key, value);
    field.system = this.system;
    return field;
  }

  public propOpt<K extends string, V extends Type>(key: K, value: V) {
    const field = new classes.ObjectOptionalFieldType<K, V>(key, value);
    field.system = this.system;
    return field;
  }

  public Map<T extends Type>(val: T, options?: schema.Optional<schema.MapSchema>) {
    const map = new classes.MapType<T>(val, options);
    map.system = this.system;
    return map;
  }

  public Or<F extends Type[]>(...types: F) {
    const or = new classes.OrType<F>(types);
    or.system = this.system;
    return or;
  }

  public Ref<T extends Type | TypeAlias<any, any>>(ref: string) {
    const type = new classes.RefType<TypeOfAlias<T>>(ref);
    type.system = this.system;
    return type;
  }

  /** @todo Shorten to `Func`. */
  public Function<Req extends Type, Res extends Type>(req: Req, res: Res) {
    const fn = new classes.FunctionType<Req, Res>(req, res);
    fn.system = this.system;
    return fn;
  }

  public Function$<Req extends Type, Res extends Type>(req: Req, res: Res) {
    const fn = new classes.FunctionStreamingType<Req, Res>(req, res);
    fn.system = this.system;
    return fn;
  }

  public import(node: schema.Schema): Type {
    switch (node.kind) {
      case 'any':
        return this.Any(node);
      case 'bool':
        return this.Boolean(node);
      case 'num':
        return this.Number(node);
      case 'str':
        return this.String(node);
      case 'bin':
        return this.Binary(this.import(node.type), node);
      case 'arr':
        return this.Array(this.import(node.type), node);
      case 'tup':
        return this.Tuple(...node.types.map((t: schema.Schema) => this.import(t))).options(node);
      case 'obj': {
        return this.Object(
          ...node.fields.map((f: any) =>
            f.optional
              ? this.propOpt(f.key, this.import(f.type)).options(f)
              : this.prop(f.key, this.import(f.type)).options(f),
          ),
        ).options(node);
      }
      case 'map':
        return this.Map(this.import(node.type), node);
      case 'const':
        return this.Const(node.value).options(node);
      case 'or':
        return this.Or(...node.types.map((t) => this.import(t as schema.Schema))).options(node);
      case 'ref':
        return this.Ref(node.ref).options(node);
      case 'fn':
        return this.Function(this.import(node.req as schema.Schema), this.import(node.res as schema.Schema)).options(
          node,
        );
      case 'fn$':
        return this.Function$(this.import(node.req as schema.Schema), this.import(node.res as schema.Schema)).options(
          node,
        );
    }
    throw new Error(`UNKNOWN_NODE [${node.kind}]`);
  }

  public from(value: unknown): Type {
    switch (typeof value) {
      case 'undefined':
        return this.undef;
      case 'boolean':
        return this.bool;
      case 'number':
        return this.num;
      case 'string':
        return this.str;
      case 'object':
        if (value === null) return this.nil;
        if (Array.isArray(value)) {
          if (value.length === 0) return this.arr;
          const getType = (v: unknown): string => {
            switch (typeof v) {
              case 'object':
                if (v === null) return 'nil';
                if (Array.isArray(v)) return 'arr';
                return 'obj';
              default:
                return typeof v;
            }
          };
          const allElementsOfTheSameType = value.every((v) => getType(v) === getType(value[0]));
          return allElementsOfTheSameType
            ? this.Array(this.from(value[0]))
            : this.Tuple(...value.map((v) => this.from(v)));
        }
        return this.Object(...Object.entries(value).map(([key, value]) => this.prop(key, this.from(value))));
      default:
        return this.any;
    }
  }
}
