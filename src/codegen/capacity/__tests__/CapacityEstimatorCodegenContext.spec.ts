import {maxEncodingCapacity} from '@jsonjoy.com/util/lib/json-size';
import {CapacityEstimatorCodegen} from '../CapacityEstimatorCodegen';
import {t} from '../../../type';
import {TypeSystem} from '../../../system';

describe('"any" type', () => {
  test('returns the same result as maxEncodingCapacity()', () => {
    const any = t.any;
    const estimator = CapacityEstimatorCodegen.get(any);
    const values = [null, true, false, 1, 123.123, '', 'adsf', [], {}, {foo: 'bar'}, [{a: [{b: null}]}]];
    for (const value of values) expect(estimator(value)).toBe(maxEncodingCapacity(value));
  });
});

describe('"con" type', () => {
  test('returns exactly the same size as maxEncodingCapacity()', () => {
    const system = new TypeSystem();
    const type = system.t.Const({foo: [123]});
    const estimator = CapacityEstimatorCodegen.get(type);
    expect(estimator(null)).toBe(maxEncodingCapacity({foo: [123]}));
  });
});

describe('"nil" type', () => {
  test('returns exactly the same size as maxEncodingCapacity()', () => {
    const system = new TypeSystem();
    const type = system.t.nil;
    const estimator = CapacityEstimatorCodegen.get(type);
    expect(estimator(null)).toBe(maxEncodingCapacity(null));
  });
});

describe('"bool" type', () => {
  test('returns 5', () => {
    const system = new TypeSystem();
    const type = system.t.bool;
    const estimator = CapacityEstimatorCodegen.get(type);
    expect(estimator(null)).toBe(5);
  });
});

describe('"num" type', () => {
  test('returns 22', () => {
    const system = new TypeSystem();
    const type = system.t.num;
    const estimator = CapacityEstimatorCodegen.get(type);
    expect(estimator(null)).toBe(22);
  });
});

describe('"str" type', () => {
  test('empty string', () => {
    const system = new TypeSystem();
    const type = system.t.str;
    const estimator = CapacityEstimatorCodegen.get(type);
    expect(estimator('')).toBe(maxEncodingCapacity(''));
  });

  test('short string', () => {
    const system = new TypeSystem();
    const type = system.t.str;
    const estimator = CapacityEstimatorCodegen.get(type);
    expect(estimator('asdf')).toBe(maxEncodingCapacity('asdf'));
  });
});

describe('"bin" type', () => {
  test('empty', () => {
    const system = new TypeSystem();
    const type = system.t.bin;
    const estimator = CapacityEstimatorCodegen.get(type);
    expect(estimator(new Uint8Array())).toBe(maxEncodingCapacity(new Uint8Array()));
  });

  test('small buffer', () => {
    const system = new TypeSystem();
    const type = system.t.bin;
    const estimator = CapacityEstimatorCodegen.get(type);
    expect(estimator(new Uint8Array([1, 2, 3]))).toBe(maxEncodingCapacity(new Uint8Array([1, 2, 3])));
  });
});

describe('"arr" type', () => {
  test('empty', () => {
    const type = t.arr;
    const estimator = CapacityEstimatorCodegen.get(type);
    expect(estimator([])).toBe(maxEncodingCapacity([]));
  });

  test('simple elements', () => {
    const system = new TypeSystem();
    const type = system.t.arr;
    const estimator = CapacityEstimatorCodegen.get(type);
    expect(estimator([1, true, 'asdf'])).toBe(maxEncodingCapacity([1, true, 'asdf']));
  });

  test('typed array, optimizes computation', () => {
    const system = new TypeSystem();
    const type = system.t.Array(system.t.num);
    const estimator = CapacityEstimatorCodegen.get(type);
    expect(estimator([1, 2, 3])).toBe(maxEncodingCapacity([1, 2, 3]));
  });

  test('array of strings', () => {
    const system = new TypeSystem();
    const type = system.t.Array(system.t.str);
    const estimator = CapacityEstimatorCodegen.get(type);
    expect(estimator(['a', 'asdf'])).toBe(maxEncodingCapacity(['a', 'asdf']));
  });

  test('empty', () => {
    const system = new TypeSystem();
    const type = system.t.tuple();
    const estimator = CapacityEstimatorCodegen.get(type);
    expect(estimator([])).toBe(maxEncodingCapacity([]));
  });

  test('two elements', () => {
    const system = new TypeSystem();
    const type = system.t.tuple(system.t.num, system.t.str);
    const estimator = CapacityEstimatorCodegen.get(type);
    expect(estimator([1, 'asdf'])).toBe(maxEncodingCapacity([1, 'asdf']));
  });

  test('head 2-tuple', () => {
    const system = new TypeSystem();
    const type = system.t.Tuple([t.Const('abc'), t.Const('xxxxxxxxx')], t.num);
    const estimator = CapacityEstimatorCodegen.get(type);
    expect(estimator(['abc', 'xxxxxxxxx', 1])).toBe(maxEncodingCapacity(['abc', 'xxxxxxxxx', 1]));
  });

  test('tail 2-tuple', () => {
    const system = new TypeSystem();
    const type = system.t.Array(t.num).tail(t.str, t.str);
    const estimator = CapacityEstimatorCodegen.get(type);
    expect(estimator([1, 'abc', 'xxxxxxxxx'])).toBe(maxEncodingCapacity([1, 'abc', 'xxxxxxxxx']));
  });
});

describe('"obj" type', () => {
  test('empty', () => {
    const system = new TypeSystem();
    const type = system.t.obj;
    const estimator = CapacityEstimatorCodegen.get(type);
    expect(estimator(123)).toBe(maxEncodingCapacity({}));
  });

  test('object with unknown fields', () => {
    const system = new TypeSystem();
    const type = system.t.obj.options({encodeUnknownKeys: true});
    const estimator = CapacityEstimatorCodegen.get(type);
    expect(estimator({foo: 'bar'})).toBe(maxEncodingCapacity({foo: 'bar'}));
  });

  test('one required key', () => {
    const system = new TypeSystem();
    const type = system.t.Object(system.t.prop('abc', system.t.str));
    const estimator = CapacityEstimatorCodegen.get(type);
    expect(estimator({abc: 'foo'})).toBe(maxEncodingCapacity({abc: 'foo'}));
  });

  test('one required and one optional keys', () => {
    const system = new TypeSystem();
    const type = system.t.Object(system.t.prop('abc', system.t.str), system.t.propOpt('key', system.t.num));
    const estimator = CapacityEstimatorCodegen.get(type);
    expect(estimator({abc: 'foo', key: 111})).toBe(maxEncodingCapacity({abc: 'foo', key: 111}));
  });
});

describe('"map" type', () => {
  test('empty', () => {
    const system = new TypeSystem();
    const type = system.t.map;
    const estimator = CapacityEstimatorCodegen.get(type);
    expect(estimator(123)).toBe(maxEncodingCapacity({}));
  });

  test('with one field', () => {
    const system = new TypeSystem();
    const type = system.t.Map(system.t.bool);
    const estimator = CapacityEstimatorCodegen.get(type);
    expect(estimator({foo: true})).toBe(maxEncodingCapacity({foo: true}));
  });

  test('three number fields', () => {
    const system = new TypeSystem();
    const type = system.t.Map(system.t.num);
    const estimator = CapacityEstimatorCodegen.get(type);
    const data = {foo: 1, bar: 2, baz: 3};
    expect(estimator(data)).toBe(maxEncodingCapacity(data));
  });

  test('nested maps', () => {
    const system = new TypeSystem();
    const type = system.t.Map(system.t.Map(system.t.str));
    const estimator = CapacityEstimatorCodegen.get(type);
    const data = {foo: {bar: 'baz'}, baz: {bar: 'foo'}};
    expect(estimator(data)).toBe(maxEncodingCapacity(data));
  });
});

describe('"ref" type', () => {
  test('two hops', () => {
    const system = new TypeSystem();
    system.alias('Id', system.t.str);
    system.alias('User', system.t.Object(system.t.prop('id', system.t.Ref('Id')), system.t.prop('name', system.t.str)));
    const type = system.t.Ref('User');
    const value = {id: 'asdf', name: 'foo'};
    const estimator = CapacityEstimatorCodegen.get(type);
    expect(estimator(value)).toBe(maxEncodingCapacity(value));
  });
});

describe('"or" type', () => {
  test('empty', () => {
    const system = new TypeSystem();
    const type = system.t.Or(system.t.str, system.t.arr).options({
      discriminator: [
        'if',
        ['==', 'string', ['type', ['get', '']]],
        0,
        ['if', ['==', 'array', ['type', ['get', '']]], 1, -1],
      ],
    });
    const estimator = CapacityEstimatorCodegen.get(type);
    expect(estimator('asdf')).toBe(maxEncodingCapacity('asdf'));
    expect(estimator([1, 2, 3])).toBe(maxEncodingCapacity([1, 2, 3]));
  });
});

test('add circular reference test', () => {
  const system = new TypeSystem();
  const {t} = system;
  const user = system.alias('User', t.Object(t.prop('id', t.str), t.propOpt('address', t.Ref('Address'))));
  const address = system.alias('Address', t.Object(t.prop('id', t.str), t.propOpt('user', t.Ref('User'))));
  const value1 = {
    id: 'user-1',
    address: {
      id: 'address-1',
      user: {
        id: 'user-2',
        address: {
          id: 'address-2',
          user: {
            id: 'user-3',
          },
        },
      },
    },
  };
  const estimator = CapacityEstimatorCodegen.get(user.type);
  expect(estimator(value1)).toBe(maxEncodingCapacity(value1));
});
