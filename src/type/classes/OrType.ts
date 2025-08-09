import * as schema from '../../schema';
import {printTree} from 'tree-dump/lib/printTree';
import {Discriminator} from '../discriminator';
import {AbsType} from './AbsType';
import type {SchemaOf, Type} from '../types';

export class OrType<T extends Type[] = any> extends AbsType<schema.OrSchema<{[K in keyof T]: SchemaOf<T[K]>}>> {
  constructor(
    public types: T,
    options?: Omit<schema.OrSchema, 'kind' | 'type'>,
  ) {
    super({
      ...schema.s.Or(),
      ...options,
      discriminator: options?.discriminator ?? Discriminator.createExpression(types),
    } as any);
  }

  public getSchema(): schema.OrSchema<{[K in keyof T]: SchemaOf<T[K]>}> {
    return {
      ...this.schema,
      types: this.types.map((type) => type.getSchema()) as any,
    };
  }

  public getOptions(): schema.Optional<schema.OrSchema<{[K in keyof T]: SchemaOf<T[K]>}>> {
    const {kind, types, ...options} = this.schema;
    return options as any;
  }

  public options(options: schema.Optional<schema.OrSchema> & Partial<Pick<schema.OrSchema, 'discriminator'>>): this {
    Object.assign(this.schema, options);
    const discriminator = options.discriminator;
    if (discriminator) {
      if (discriminator.length === 2 && discriminator[0] === 'num' && discriminator[1] === -1) {
        this.schema.discriminator = Discriminator.createExpression(this.types);
      }
    }
    return this;
  }

  public toString(tab: string = ''): string {
    return super.toString(tab) + printTree(tab, [
      (tab: string) => 'discriminator: ' + JSON.stringify(this.schema.discriminator, null, 2).split('\n').join('\n' + tab),
      ...this.types.map((type) => (tab: string) => type.toString(tab))
    ]);
  }
}
