import {t} from '../..';
import type {ResolveType} from '../../../system';

describe('.prop()', () => {
  test('can add a property to an object', () => {
    const obj1 = t.Object(t.prop('a', t.str));
    const obj2 = obj1.prop('b', t.num);
    const val1: ResolveType<typeof obj1> = {
      a: 'hello',
    };
    const val2: ResolveType<typeof obj2> = {
      a: 'hello',
      b: 123,
    };
  });

  test('can create an object using .prop() fields', () => {
    const object = t.obj.prop('a', t.str).prop('b', t.num, {title: 'B'}).prop('c', t.bool, {description: 'C'});
    expect(object.getSchema()).toMatchObject({
      kind: 'obj',
      fields: [
        {kind: 'field', key: 'a', value: {kind: 'str'}},
        {kind: 'field', key: 'b', value: {kind: 'num'}, title: 'B'},
        {kind: 'field', key: 'c', value: {kind: 'bool'}, description: 'C'},
      ],
    });
  });
});

describe('.opt()', () => {
  test('can create add optional properties', () => {
    const object = t.obj
      .prop('a', t.str)
      .prop('b', t.num, {title: 'B'})
      .prop('c', t.bool, {description: 'C'})
      .opt('d', t.nil, {description: 'D'});
    expect(object.getSchema()).toMatchObject({
      kind: 'obj',
      fields: [
        {kind: 'field', key: 'a', value: {kind: 'str'}},
        {kind: 'field', key: 'b', value: {kind: 'num'}, title: 'B'},
        {kind: 'field', key: 'c', value: {kind: 'bool'}, description: 'C'},
        {kind: 'field', key: 'd', value: {kind: 'con', value: null}, description: 'D', optional: true},
      ],
    });
  });
});

describe('.extend()', () => {
  test('can extend an object', () => {
    const obj1 = t.Object(t.prop('a', t.str));
    const obj2 = t.Object(t.prop('b', t.num));
    const obj3 = obj1.extend(obj2);
    expect(typeof obj1.getField('a')).toBe('object');
    expect(typeof obj1.getField('b' as any)).toBe('undefined');
    expect(typeof obj2.getField('a' as any)).toBe('undefined');
    expect(typeof obj2.getField('b')).toBe('object');
    expect(typeof obj3.getField('a')).toBe('object');
    expect(typeof obj3.getField('b')).toBe('object');
    const val1: ResolveType<typeof obj1> = {
      a: 'hello',
    };
    const val2: ResolveType<typeof obj2> = {
      b: 123,
    };
    const val3: ResolveType<typeof obj3> = {
      a: 'hello',
      b: 123,
    };
  });

  test('can extend an empty object', () => {
    const obj1 = t.Object();
    const obj2 = t.Object(t.prop('b', t.num));
    const obj3 = obj1.extend(obj2);
    expect(typeof obj1.getField('b')).toBe('undefined');
    expect(typeof obj2.getField('b')).toBe('object');
    expect(typeof obj3.getField('b')).toBe('object');
    const val1: ResolveType<typeof obj1> = {};
    const val2: ResolveType<typeof obj2> = {
      b: 123,
    };
    const val3: ResolveType<typeof obj3> = {
      b: 123,
    };
  });
});

describe('.omit()', () => {
  test('can remove a field from an object', () => {
    const obj1 = t.Object(t.prop('a', t.str), t.prop('b', t.num));
    const obj2 = obj1.omit('b');
    expect(typeof obj1.getField('a')).toBe('object');
    expect(typeof obj1.getField('b')).toBe('object');
    expect(typeof obj2.getField('a')).toBe('object');
    expect(typeof obj2.getField('b' as any)).toBe('undefined');
    const val1: ResolveType<typeof obj1> = {
      a: 'hello',
      b: 123,
    };
    const val2: ResolveType<typeof obj2> = {
      a: 'hello',
    };
  });
});

describe('.pick()', () => {
  test('can pick a field from object', () => {
    const obj1 = t.Object(t.prop('a', t.str), t.prop('b', t.num));
    const obj2 = obj1.pick('a');
    const obj3 = obj1.pick('b');
    expect(typeof obj1.getField('a')).toBe('object');
    expect(typeof obj1.getField('b')).toBe('object');
    expect(typeof obj2.getField('a')).toBe('object');
    expect(typeof obj2.getField('b' as any)).toBe('undefined');
    expect(typeof obj3.getField('a' as any)).toBe('undefined');
    expect(typeof obj3.getField('b')).toBe('object');
    const val1: ResolveType<typeof obj1> = {
      a: 'hello',
      b: 123,
    };
    const val2: ResolveType<typeof obj2> = {
      a: 'hello',
    };
    const val3: ResolveType<typeof obj3> = {
      b: 123,
    };
  });
});
