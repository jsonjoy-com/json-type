import type {TypeOf} from '../../schema';
import type {SchemaOf} from '../../type';
import {TypeSystem} from '../TypeSystem';
import type {TypeOfAlias} from '../types';

test('can infer alias type', () => {
  const system = new TypeSystem();
  const {t} = system;
  const user = system.alias('User', t.Object(t.prop('id', t.str), t.propOpt('name', t.str)));
  type T = TypeOf<SchemaOf<TypeOfAlias<typeof user>>>;
  const value: T = {
    id: 'string',
  };
});
