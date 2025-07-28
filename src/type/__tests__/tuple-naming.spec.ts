import {t} from '../index';

describe('Tuple naming functionality', () => {
  test('can create a tuple with regular types', () => {
    const tuple = t.Tuple(t.num, t.str);
    const schema = tuple.getSchema();

    expect(schema).toStrictEqual({
      kind: 'tup',
      types: [{kind: 'num'}, {kind: 'str'}],
    });
  });

  test('can create a tuple with named fields', () => {
    const tuple = t.Tuple(t.prop('x', t.num), t.prop('y', t.str));
    const schema = tuple.getSchema();

    expect(schema).toStrictEqual({
      kind: 'tup',
      types: [
        {kind: 'field', key: 'x', value: {kind: 'num'}},
        {kind: 'field', key: 'y', value: {kind: 'str'}},
      ],
    });
  });

  test('can create a tuple with mixed named and unnamed fields', () => {
    const tuple = t.Tuple(t.prop('x', t.num), t.str);
    const schema = tuple.getSchema();

    expect(schema).toStrictEqual({
      kind: 'tup',
      types: [{kind: 'field', key: 'x', value: {kind: 'num'}}, {kind: 'str'}],
    });
  });

  test('can use shorthand tuple method with named fields', () => {
    const tuple = t.tuple(t.prop('x', t.num), t.prop('y', t.str));
    const schema = tuple.getSchema();

    expect(schema).toStrictEqual({
      kind: 'tup',
      types: [
        {kind: 'field', key: 'x', value: {kind: 'num'}},
        {kind: 'field', key: 'y', value: {kind: 'str'}},
      ],
    });
  });

  test('validation works with named tuples', () => {
    const tuple = t.Tuple(t.prop('x', t.num), t.prop('y', t.str));

    // Valid data
    expect(() => tuple.validate([42, 'hello'])).not.toThrow();

    // Invalid data - wrong types
    expect(() => tuple.validate(['hello', 42])).toThrow();

    // Invalid data - wrong length
    expect(() => tuple.validate([42])).toThrow();
    expect(() => tuple.validate([42, 'hello', 'extra'])).toThrow();
  });

  test('JSON encoding works with named tuples', () => {
    const tuple = t.Tuple(t.prop('x', t.num), t.prop('y', t.str));

    const result = tuple.toJson([42, 'hello']);
    expect(result).toBe('[42,"hello"]');
  });
});
