import * as schema from '../../schema';
import type {SchemaOf, Type} from '../types';
import {AbsType} from './AbsType';

export class RefType<T extends Type = any> extends AbsType<schema.RefSchema<SchemaOf<T>>> {
  protected _ref: string | (() => string);

  constructor(ref: string | (() => string)) {
    super(schema.s.Ref<SchemaOf<T>>(typeof ref === 'function' ? 'lazy' : ref));
    this._ref = ref;
  }

  public ref(): string {
    const _ref = this._ref;
    return typeof _ref === 'function' ? _ref() : _ref;
  }

  public getOptions(): schema.Optional<schema.RefSchema<SchemaOf<T>>> {
    const {kind, ref, ...options} = this.schema;
    return options as any;
  }

  public resolve(): Type {
    return this.getSystem().resolve(this.ref()).type as Type;
  }

  public getSchema() {
    const _ref = this._ref;
    const ref = typeof _ref === 'function' ? _ref() : _ref;
    return {...super.getSchema(), ref} as any;
  }

  public toStringTitle(tab: string = ''): string {
    const options = this.toStringOptions();
    return `${super.toStringTitle()} → [${this.ref()}]` + (options ? ` ${options}` : '');
  }
}
