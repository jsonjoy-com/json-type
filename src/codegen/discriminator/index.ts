import {JsonExpressionCodegen} from '@jsonjoy.com/json-expression';
import {operatorsMap} from '@jsonjoy.com/json-expression/lib/operators';
import {Vars} from '@jsonjoy.com/json-expression/lib/Vars';
import {lazyKeyedFactory} from '../util';
import type {OrType} from '../../type';

export type DiscriminatorFn = (val: unknown) => number;

export class DiscriminatorCodegen {
  public static readonly get = lazyKeyedFactory((or: OrType): DiscriminatorFn => {
    const expr = or.schema.discriminator;
    if (!expr || (expr[0] === 'num' && expr[1] === 0)) throw new Error('NO_DISCRIMINATOR');
    const codegen = new JsonExpressionCodegen({
      expression: expr,
      operators: operatorsMap,
    });
    const generated = codegen.run().compile();
    return (data: unknown) => +(generated(new Vars(data)) as any);
  });
}
