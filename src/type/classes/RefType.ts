import {AbsType} from './AbsType';
import * as schema from '../../schema';
import type {SchemaOf, Type} from '../types';

export class RefType<T extends Type = any> extends AbsType<schema.RefSchema<SchemaOf<T>>> {
  constructor(ref: string) {
    super(schema.s.Ref<SchemaOf<T>>(ref));
  }

  public ref(): string {
    return this.schema.ref;
  }

  public getOptions(): schema.Optional<schema.RefSchema<SchemaOf<T>>> {
    const {kind, ref, ...options} = this.schema;
    return options as any;
  }

  public toStringTitle(tab: string = ''): string {
    const options = this.toStringOptions();
    return `${super.toStringTitle()} → [${this.schema.ref}]` + (options ? ` ${options}` : '');
  }
}
