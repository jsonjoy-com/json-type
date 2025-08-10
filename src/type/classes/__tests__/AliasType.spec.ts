import type {TypeOf} from '../../../schema';
import type {SchemaOf, TypeOfAlias} from '../../types';
import {ModuleType} from '../ModuleType';

test('can infer alias type', () => {
  const system = new ModuleType();
  const {t} = system;
  const user = system.alias('User', t.Object(t.prop('id', t.str), t.propOpt('name', t.str)));
  type T = TypeOf<SchemaOf<TypeOfAlias<typeof user>>>;
  const value: T = {
    id: 'string',
  };
});
