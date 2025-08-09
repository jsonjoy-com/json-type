import {printTree} from 'tree-dump/lib/printTree';
import type {TypeSystem} from '.';
import type {Type} from '../type';
import type {Printable} from 'tree-dump/lib/types';

/**
 * @todo Rename to `Alias`.
 */
export class TypeAlias<K extends string, T extends Type> implements Printable {
  public constructor(
    public readonly system: TypeSystem,
    public readonly id: K,
    public readonly type: T,
  ) {}

  public getType(): Type {
    return this.type;
  }

  public resolve(): TypeAlias<string, Type> {
    return this.system.resolve(this.id);
  }

  public toString(tab: string = '') {
    return this.id + printTree(tab, [(tab) => this.type.toString(tab)]);
  }
}
