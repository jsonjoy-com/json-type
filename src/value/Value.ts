import type {Printable} from 'tree-dump';
import {printTree} from 'tree-dump/lib/printTree';
import type {ResolveType, Type} from '../type/types';

export class Value<T extends Type = Type> implements Printable {
  constructor(
    public type: T,
    public data: ResolveType<T>,
  ) {}

  public toString(tab: string = ''): string {
    return 'Value' + printTree(tab, [(tab) => this.type.toString(tab)]);
  }
}
