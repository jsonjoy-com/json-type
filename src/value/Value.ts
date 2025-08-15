import {printTree} from 'tree-dump/lib/printTree';
import type {Printable} from 'tree-dump';
import type {ResolveType, Type} from '../type/types';

export class Value<T extends Type = Type> implements Printable {
  constructor(
    public data: ResolveType<T>,
    public type?: T,
  ) {}

  public toString(tab: string = ''): string {
    const type = this.type;
    return 'Value' + (type ? printTree(tab, [(tab) => type.toString(tab)]) : '');
  }
}

export const unknown = (data: unknown): Value<Type> => new (Value as any)(data);
