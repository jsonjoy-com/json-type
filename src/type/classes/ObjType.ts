import {printTree} from 'tree-dump/lib/printTree';
import * as schema from '../../schema';
import {AbsType} from './AbsType';
import type {SchemaOf, SchemaOfObjectFields, Type} from '../types';
import type {ExcludeFromTuple, PickFromTuple} from '../../util/types';

export class ObjKeyType<K extends string, V extends Type> extends AbsType<
  schema.ObjFieldSchema<K, SchemaOf<V>>
> {
  public readonly optional: boolean = false;

  constructor(
    public readonly key: K,
    public readonly val: V,
  ) {
    super(schema.s.prop(key, schema.s.any) as any);
  }

  public getSchema(): schema.ObjFieldSchema<K, SchemaOf<V>> {
    return {
      ...this.schema,
      value: this.val.getSchema() as any,
    };
  }

  public getOptions(): schema.Optional<schema.ObjFieldSchema<K, SchemaOf<V>>> {
    const {kind, key, value, optional, ...options} = this.schema;
    return options as any;
  }

  protected toStringTitle(): string {
    return `"${this.key}":`;
  }

  public toString(tab: string = ''): string {
    return super.toString(tab) + printTree(tab + ' ', [(tab) => this.val.toString(tab)]);
  }
}

export class ObjKeyOptType<K extends string, V extends Type> extends ObjKeyType<K, V> {
  public readonly optional: boolean = true;

  constructor(
    public readonly key: K,
    public readonly val: V,
  ) {
    super(key, val);
    (this as any).schema = schema.s.propOpt(key, schema.s.any) as any;
  }

  protected toStringTitle(): string {
    return `"${this.key}"?:`;
  }
}

export class ObjType<F extends ObjKeyType<any, any>[] = ObjKeyType<any, any>[]> extends AbsType<
  schema.ObjSchema<SchemaOfObjectFields<F>>
> {
  constructor(public readonly fields: F) {
    super(schema.s.obj as any);
  }

  private _field(
    field: ObjKeyType<any, any>,
    options?: schema.Optional<schema.ObjFieldSchema<any, any>>,
  ): void {
    if (options) field.options(options);
    field.system = this.system;
    this.fields.push(field as any);
  }

  /**
   * Adds a property to the object type.
   * @param key The key of the property.
   * @param value The value type of the property.
   * @param options Optional schema options for the property.
   * @returns A new object type with the added property.
   */
  public prop<K extends string, V extends Type>(
    key: K,
    value: V,
    options?: schema.Optional<schema.ObjFieldSchema<K, SchemaOf<V>>>,
  ): ObjType<[...F, ObjKeyType<K, V>]> {
    this._field(new ObjKeyType<K, V>(key, value), options);
    return <any>this;
  }

  /**
   * Adds an optional property to the object type.
   * @param key The key of the property.
   * @param value The value type of the property.
   * @param options Optional schema options for the property.
   * @returns A new object type with the added property.
   */
  public opt<K extends string, V extends Type>(
    key: K,
    value: V,
    options?: schema.Optional<schema.ObjFieldSchema<K, SchemaOf<V>>>,
  ): ObjType<[...F, ObjKeyOptType<K, V>]> {
    this._field(new ObjKeyOptType<K, V>(key, value), options);
    return <any>this;
  }

  public getSchema(): schema.ObjSchema<SchemaOfObjectFields<F>> {
    return {
      ...this.schema,
      fields: this.fields.map((f) => f.getSchema()) as any,
    };
  }

  public getOptions(): schema.Optional<schema.ObjSchema<SchemaOfObjectFields<F>>> {
    const {kind, fields, ...options} = this.schema;
    return options as any;
  }

  public getField<K extends keyof schema.TypeOf<schema.ObjSchema<SchemaOfObjectFields<F>>>>(
    key: K,
  ): ObjKeyType<string, Type> | undefined {
    return this.fields.find((f) => f.key === key);
  }

  public extend<F2 extends ObjKeyType<any, any>[]>(o: ObjType<F2>): ObjType<[...F, ...F2]> {
    const type = new ObjType([...this.fields, ...o.fields]) as ObjType<[...F, ...F2]>;
    type.system = this.system;
    return type;
  }

  public omit<K extends keyof schema.TypeOf<schema.ObjSchema<SchemaOfObjectFields<F>>>>(
    key: K,
  ): ObjType<ExcludeFromTuple<F, ObjKeyType<K extends string ? K : never, any>>> {
    const type = new ObjType(this.fields.filter((f) => f.key !== key) as any);
    type.system = this.system;
    return type;
  }

  public pick<K extends keyof schema.TypeOf<schema.ObjSchema<SchemaOfObjectFields<F>>>>(
    key: K,
  ): ObjType<PickFromTuple<F, ObjKeyType<K extends string ? K : never, any>>> {
    const field = this.fields.find((f) => f.key === key);
    if (!field) throw new Error('FIELD_NOT_FOUND');
    const type = new ObjType([field] as any);
    type.system = this.system;
    return type;
  }

  public toString(tab: string = ''): string {
    return (
      super.toString(tab) +
      printTree(
        tab,
        this.fields.map((field) => (tab) => field.toString(tab)),
      )
    );
  }
}
