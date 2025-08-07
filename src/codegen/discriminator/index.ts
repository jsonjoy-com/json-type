import {JsonExpressionCodegen} from '@jsonjoy.com/json-expression';
import {operatorsMap} from '@jsonjoy.com/json-expression/lib/operators';
import {Vars} from '@jsonjoy.com/json-expression/lib/Vars';
import {OrType} from '../../type';

export type DiscriminatorFn = (val: unknown) => number;

const CACHE = new WeakMap<OrType, DiscriminatorFn>();

export class DiscriminatorCodegen {
  public static readonly get = (or: OrType): DiscriminatorFn => {
    const fn = CACHE.get(or);
    if (fn) return fn;
    const expr = or.schema.discriminator;
    if (!expr || (expr[0] === 'num' && expr[1] === 0)) throw new Error('NO_DISCRIMINATOR');
    const codegen = new JsonExpressionCodegen({
      expression: expr,
      operators: operatorsMap,
    });
    const _newFn = codegen.run().compile();
    const newFn = (data: unknown) => +(_newFn(new Vars(data)) as any);
    CACHE.set(or, newFn);
    return newFn;
  };
}