import {ModuleType} from '../../type/classes/ModuleType';
import {aliasToJsonSchema} from '../converter';

test('can export recursive schema', () => {
  const system = new ModuleType();
  const {t} = system;
  const post = system.alias('Post', t.Object(t.prop('id', t.str), t.propOpt('author', t.Ref('User'))));
  system.alias('Stream', t.Object(t.prop('id', t.str), t.prop('posts', t.Array(t.Ref('Post')))));
  system.alias('User', t.Object(t.prop('id', t.str), t.prop('name', t.str), t.prop('following', t.Ref('Stream'))));
  const schema = aliasToJsonSchema(post);
  expect(schema.$ref).toBe('#/$defs/Post');
  expect(typeof schema.$defs?.Post).toBe('object');
  expect(typeof schema.$defs?.Stream).toBe('object');
  expect(typeof schema.$defs?.User).toBe('object');
});
