import {printTree} from 'tree-dump/lib/printTree';
import type {Printable} from 'tree-dump/lib/types';
import type * as classes from '../type';
import type {TypeBuilder} from '../type/TypeBuilder';
import {ModuleType} from '../type/classes/ModuleType';
import {Value} from './Value';

export type UnObjType<T> = T extends classes.ObjType<infer U> ? U : never;
export type UnObjValue<T> = T extends ObjValue<infer U> ? U : never;
export type UnObjFieldTypeVal<T> = T extends classes.KeyType<any, infer U> ? U : never;
export type ObjFieldToTuple<F> = F extends classes.KeyType<infer K, infer V> ? [K, V] : never;
export type ToObject<T> = T extends [string, unknown][] ? {[K in T[number] as K[0]]: K[1]} : never;
export type ObjValueToTypeMap<F> = ToObject<{
  [K in keyof F]: ObjFieldToTuple<F[K]>;
}>;

export class ObjValue<T extends classes.ObjType<any>> extends Value<T> implements Printable {
  public static new = (system: ModuleType = new ModuleType()) => new ObjValue({}, system.t.obj);

  public get system(): classes.ModuleType {
    return (this.type as T).getSystem();
  }

  public get t(): TypeBuilder {
    return this.system.t;
  }

  public keys(): string[] {
    const type = this.type as T;
    return type.keys.map((field: classes.KeyType<string, any>) => field.key);
  }

  public get<K extends keyof ObjValueToTypeMap<UnObjType<T>>>(
    key: K,
  ): Value<
    ObjValueToTypeMap<UnObjType<T>>[K] extends classes.Type ? ObjValueToTypeMap<UnObjType<T>>[K] : classes.Type
  > {
    const field = this.type!.getField(<string>key);
    if (!field) throw new Error('NO_FIELD');
    const data = (this.data as Record<string, unknown>)[<string>key];
    return new Value(data, field.val) as any;
  }

  public field<F extends classes.KeyType<any, any>>(
    field: F | ((t: TypeBuilder) => F),
    data: classes.ResolveType<UnObjFieldTypeVal<F>>,
  ): ObjValue<classes.ObjType<[...UnObjType<T>, F]>> {
    field = typeof field === 'function' ? field((this.type as classes.ObjType<any>).getSystem().t) : field;
    (this.data as any)[field.key] = data;
    const type = this.type!;
    const system = type.system;
    if (!system) throw new Error('NO_SYSTEM');
    type.keys.push(field);
    return this as any;
  }

  public add<K extends string, V extends classes.Type>(
    key: K,
    type: V,
    data: classes.ResolveType<V>,
  ) {
    const system = (this.type as classes.ObjType<any>).getSystem();
    const t = system.t;
    return this.field(t.Key(key, type), data);
  }

  public set<K extends string, V extends classes.Type>(key: K, value: Value<V>) {
    return this.add(key, value.type!, value.data);
  }

  public merge<O extends ObjValue<any>>(obj: O): ObjValue<classes.ObjType<[...UnObjType<T>, ...UnObjType<O['type']>]>> {
    Object.assign(this.data as object, obj.data);
    const type = this.type!;
    const system = type.system;
    if (!system) throw new Error('NO_SYSTEM');
    type.keys.push(...type.keys);
    return this as any;
  }

  public toString(tab: string = ''): string {
    return 'ObjValue' + printTree(tab, [(tab) => this.type!.toString(tab)]);
  }
}
