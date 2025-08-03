import {maxEncodingCapacity} from '@jsonjoy.com/util/lib/json-size';
// import {TypeSystem} from '../../../system';
import {CapacityEstimatorCodegen} from '../CapacityEstimatorCodegen';
import {t} from '../../../type';
import {TypeSystem} from '../../../system';

describe('"any" type', () => {
  test('returns the same result as maxEncodingCapacity()', () => {
    // const system = new TypeSystem();
    const any = t.any;
    const estimator = CapacityEstimatorCodegen.compile({type: any});
    const values = [null, true, false, 1, 123.123, '', 'adsf', [], {}, {foo: 'bar'}, [{a: [{b: null}]}]];
    for (const value of values) expect(estimator(value)).toBe(maxEncodingCapacity(value));
  });
});

describe('const', () => {
  test('returns exactly the same size as maxEncodingCapacity()', () => {
    const system = new TypeSystem();
    const type = system.t.Const({foo: [123]});
    const estimator = CapacityEstimatorCodegen.compile({type});
    expect(estimator(null)).toBe(maxEncodingCapacity({foo: [123]}));
  });
});

describe('null', () => {
  test('returns exactly the same size as maxEncodingCapacity()', () => {
    const system = new TypeSystem();
    const type = system.t.nil;
    const estimator = CapacityEstimatorCodegen.compile({type});
    expect(estimator(null)).toBe(maxEncodingCapacity(null));
  });
});

describe('boolean', () => {
  test('returns 5', () => {
    const system = new TypeSystem();
    const type = system.t.bool;
    const estimator = CapacityEstimatorCodegen.compile({type});
    expect(estimator(null)).toBe(5);
  });
});

describe('number', () => {
  test('returns 22', () => {
    const system = new TypeSystem();
    const type = system.t.num;
    const estimator = CapacityEstimatorCodegen.compile({type});
    expect(estimator(null)).toBe(22);
  });
});

describe('string', () => {
  test('empty string', () => {
    const system = new TypeSystem();
    const type = system.t.str;
    const estimator = CapacityEstimatorCodegen.compile({type});
    expect(estimator('')).toBe(maxEncodingCapacity(''));
  });

  test('short string', () => {
    const system = new TypeSystem();
    const type = system.t.str;
    const estimator = CapacityEstimatorCodegen.compile({type});
    expect(estimator('asdf')).toBe(maxEncodingCapacity('asdf'));
  });
});

describe('binary', () => {
  test('empty', () => {
    const system = new TypeSystem();
    const type = system.t.bin;
    const estimator = CapacityEstimatorCodegen.compile({type});
    expect(estimator(new Uint8Array())).toBe(maxEncodingCapacity(new Uint8Array()));
  });

  test('small buffer', () => {
    const system = new TypeSystem();
    const type = system.t.bin;
    const estimator = CapacityEstimatorCodegen.compile({type});
    expect(estimator(new Uint8Array([1, 2, 3]))).toBe(maxEncodingCapacity(new Uint8Array([1, 2, 3])));
  });
});

describe('array', () => {
  test('empty', () => {
    const type = t.arr;
    const estimator = CapacityEstimatorCodegen.compile({type});
    expect(estimator([])).toBe(maxEncodingCapacity([]));
  });

  test('simple elements', () => {
    const system = new TypeSystem();
    const type = system.t.arr;
    const estimator = CapacityEstimatorCodegen.compile({type});
    expect(estimator([1, true, 'asdf'])).toBe(maxEncodingCapacity([1, true, 'asdf']));
  });

  test('typed array, optimizes computation', () => {
    const system = new TypeSystem();
    const type = system.t.Array(system.t.num);
    const estimator = CapacityEstimatorCodegen.compile({type});
    expect(estimator([1, 2, 3])).toBe(maxEncodingCapacity([1, 2, 3]));
  });

  test('array of strings', () => {
    const system = new TypeSystem();
    const type = system.t.Array(system.t.str);
    const estimator = CapacityEstimatorCodegen.compile({type});
    expect(estimator(['a', 'asdf'])).toBe(maxEncodingCapacity(['a', 'asdf']));
  });
});

// describe('tuple', () => {
//   test('empty', () => {
//     const system = new TypeSystem();
//     const type = system.t.Tuple();
//     const estimator = type.compileCapacityEstimator({});
//     expect(estimator([])).toBe(maxEncodingCapacity([]));
//   });

//   test('two elements', () => {
//     const system = new TypeSystem();
//     const type = system.t.Tuple(system.t.num, system.t.str);
//     const estimator = type.compileCapacityEstimator({});
//     expect(estimator([1, 'asdf'])).toBe(maxEncodingCapacity([1, 'asdf']));
//   });
// });

describe('object', () => {
  test('empty', () => {
    const system = new TypeSystem();
    const type = system.t.obj;
    const estimator = CapacityEstimatorCodegen.compile({type});
    expect(estimator(123)).toBe(maxEncodingCapacity({}));
  });

  test('object with unknown fields', () => {
    const system = new TypeSystem();
    const type = system.t.obj.options({encodeUnknownFields: true});
    const estimator = CapacityEstimatorCodegen.compile({type});
    expect(estimator({foo: 'bar'})).toBe(maxEncodingCapacity({foo: 'bar'}));
  });

  test('one required key', () => {
    const system = new TypeSystem();
    const type = system.t.Object(system.t.prop('abc', system.t.str));
    const estimator = CapacityEstimatorCodegen.compile({type});
    expect(estimator({abc: 'foo'})).toBe(maxEncodingCapacity({abc: 'foo'}));
  });

  test('one required and one optional keys', () => {
    const system = new TypeSystem();
    const type = system.t.Object(system.t.prop('abc', system.t.str), system.t.propOpt('key', system.t.num));
    const estimator = CapacityEstimatorCodegen.compile({type});
    expect(estimator({abc: 'foo', key: 111})).toBe(maxEncodingCapacity({abc: 'foo', key: 111}));
  });
});

// describe('map', () => {
//   test('empty', () => {
//     const system = new TypeSystem();
//     const type = system.t.map;
//     const estimator = type.compileCapacityEstimator({});
//     expect(estimator(123)).toBe(maxEncodingCapacity({}));
//   });

//   test('with one field', () => {
//     const system = new TypeSystem();
//     const type = system.t.Map(system.t.bool);
//     const estimator = type.compileCapacityEstimator({});
//     expect(estimator({foo: true})).toBe(maxEncodingCapacity({foo: true}));
//   });

//   test('three number fields', () => {
//     const system = new TypeSystem();
//     const type = system.t.Map(system.t.num);
//     const estimator = type.compileCapacityEstimator({});
//     const data = {foo: 1, bar: 2, baz: 3};
//     expect(estimator(data)).toBe(maxEncodingCapacity(data));
//   });

//   test('nested maps', () => {
//     const system = new TypeSystem();
//     const type = system.t.Map(system.t.Map(system.t.str));
//     const estimator = type.compileCapacityEstimator({});
//     const data = {foo: {bar: 'baz'}, baz: {bar: 'foo'}};
//     expect(estimator(data)).toBe(maxEncodingCapacity(data));
//   });
// });

// describe('ref', () => {
//   test('two hops', () => {
//     const system = new TypeSystem();
//     system.alias('Id', system.t.str);
//     system.alias('User', system.t.Object(system.t.prop('id', system.t.Ref('Id')), system.t.prop('name', system.t.str)));
//     const type = system.t.Ref('User');
//     const value = {id: 'asdf', name: 'foo'};
//     const estimator = type.capacityEstimator();
//     expect(estimator(value)).toBe(maxEncodingCapacity(value));
//   });
// });

// describe('or', () => {
//   test('empty', () => {
//     const system = new TypeSystem();
//     const type = system.t.Or(system.t.str, system.t.arr).options({
//       discriminator: [
//         'if',
//         ['==', 'string', ['type', ['get', '']]],
//         0,
//         ['if', ['==', 'array', ['type', ['get', '']]], 1, -1],
//       ],
//     });
//     const estimator = type.compileCapacityEstimator({});
//     expect(estimator('asdf')).toBe(maxEncodingCapacity('asdf'));
//     expect(estimator([1, 2, 3])).toBe(maxEncodingCapacity([1, 2, 3]));
//   });
// });

// describe('standalone codegen function', () => {
//   test('generates capacity estimator equivalent to compileCapacityEstimator', () => {
//     const system = new TypeSystem();
//     const type = system.t.Array(system.t.str);

//     // Compare standalone codegen function with the class method
//     const {codegen} = require('../estimators');
//     const standaloneEstimator = codegen(type, {});
//     const classEstimator = type.compileCapacityEstimator({});

//     const testData = ['hello', 'world', 'test'];
//     expect(standaloneEstimator(testData)).toBe(classEstimator(testData));
//     expect(standaloneEstimator(testData)).toBe(maxEncodingCapacity(testData));
//   });

//   test('works with complex nested types', () => {
//     const system = new TypeSystem();
//     const type = system.t.Object(
//       system.t.prop('name', system.t.str),
//       system.t.prop('items', system.t.Array(system.t.num)),
//     );

//     const {codegen} = require('../estimators');
//     const standaloneEstimator = codegen(type, {});
//     const classEstimator = type.compileCapacityEstimator({});

//     const testData = {name: 'test', items: [1, 2, 3, 4, 5]};
//     expect(standaloneEstimator(testData)).toBe(classEstimator(testData));
//     expect(standaloneEstimator(testData)).toBe(maxEncodingCapacity(testData));
//   });

//   test('works with const types', () => {
//     const system = new TypeSystem();
//     const type = system.t.Const('hello world');

//     const {codegen} = require('../estimators');
//     const standaloneEstimator = codegen(type, {});

//     // For const types, the value doesn't matter
//     expect(standaloneEstimator(null)).toBe(maxEncodingCapacity('hello world'));
//   });
// });
