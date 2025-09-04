import {ModuleType} from '../classes/ModuleType';
import {ResolveType} from '../types';

test('...', () => {
  const mod = new ModuleType();
  const t = mod.t;

  const Str = t.str;
  const Obj = t.object({
    x: () => Str,
  });

  type asdf = ResolveType<typeof Obj>;
  t.Array(Str);

  const Node = t.object({
    value: t.any,
    key: t.str,
    left: () => Node,
    right: () => Node,
  });


});
