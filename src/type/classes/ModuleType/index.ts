import {TypeBuilder} from '../../TypeBuilder';
import {AliasType} from '../AliasType';
import {printTree} from 'tree-dump/lib/printTree';
import type {RefType} from '../RefType';
import type {Printable} from 'tree-dump/lib/types';
import type {TypeMap} from '../../../schema';
import type {Type} from '../../../type';

export class ModuleType implements Printable {
  public readonly t = new TypeBuilder(this);

  public readonly aliases: Map<string, AliasType<string, any>> = new Map();

  /**
   * @todo Add ability fetch object of given type by its ID, analogous to
   * GraphQL "nodes".
   */
  public readonly alias = <K extends string, T extends Type>(id: K, type: T): AliasType<K, T> => {
    const existingAlias = this.aliases.get(id);
    if (existingAlias) return existingAlias as AliasType<K, T>;
    const alias = new AliasType<K, T>(this, id, type);
    this.aliases.set(id, alias);
    return alias;
  };

  public readonly unalias = <K extends string>(id: K): AliasType<K, Type> => {
    const alias = this.aliases.get(id);
    if (!alias) throw new Error(`Alias [id = ${id}] not found.`);
    return <AliasType<K, Type>>alias;
  };

  public readonly hasAlias = (id: string): boolean => this.aliases.has(id);

  public readonly resolve = <K extends string>(id: K): AliasType<K, Type> => {
    const alias = this.unalias(id);
    return alias.type.kind() === 'ref' ? this.resolve<K>((alias.type as RefType).ref() as K) : alias;
  };

  public exportTypes() {
    const result: Record<string, unknown> = {};
    for (const [id, alias] of this.aliases.entries()) {
      result[id] = alias.getType().getSchema();
    }
    return result;
  }

  public importTypes<A extends TypeMap>(
    types: A,
  ): {
    readonly [K in keyof A]: AliasType<
      K extends string ? K : never,
      /** @todo Replace `any` by inferred type here. */ any
    >;
  } {
    const result = {} as any;
    for (const id in types) result[id] = this.alias(id, this.t.import(types[id]));
    return result;
  }

  public toString(tab: string = '') {
    return (
      'Module' +
      printTree(tab, [
        (tab) =>
          'aliases' +
          printTree(
            tab,
            [...this.aliases.values()].map((alias) => (tab) => alias.toString(tab)),
          ),
      ])
    );
  }
}
