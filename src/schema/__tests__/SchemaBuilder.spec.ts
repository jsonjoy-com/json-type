import {type ConstSchema, s} from '..';

describe('string', () => {
  test('can create a string type', () => {
    expect(s.String()).toEqual({kind: 'str'});
  });

  test('can create a named a string type', () => {
    expect(s.String('UserName')).toEqual({
      kind: 'str',
      id: 'UserName',
    });
  });
});

describe('object', () => {
  test('can create an empty object using shorthand', () => {
    expect(s.obj).toEqual({kind: 'obj', fields: []});
  });

  test('can create an empty object using default syntax', () => {
    expect(s.Object()).toEqual({kind: 'obj', fields: []});
  });

  test('can create an empty object using fields-first syntax', () => {
    expect(s.Object()).toEqual({kind: 'obj', fields: []});
  });

  test('can create a named empty object using fields-first syntax', () => {
    expect(s.Object([])).toEqual({kind: 'obj', fields: []});
  });

  test('can create a named empty object using default syntax', () => {
    expect(s.Object({fields: []})).toEqual({kind: 'obj', fields: []});
  });

  test('can specify types', () => {
    const type = s.Object([s.prop('id', s.String('UserId')), s.prop('name', s.str)]);
    expect(type).toEqual({
      kind: 'obj',
      fields: [
        {
          kind: 'field',
          key: 'id',
          value: {
            kind: 'str',
            id: 'UserId',
          },
        },
        {
          kind: 'field',
          key: 'name',
          value: {
            kind: 'str',
          },
        },
      ],
    });
  });
});

describe('map', () => {
  test('can create an simple object using shorthand', () => {
    expect(s.map).toEqual({kind: 'map', value: {kind: 'any'}});
  });

  test('can define a map', () => {
    expect(s.Map(s.Boolean())).toEqual({kind: 'map', value: {kind: 'bool'}});
  });
});

describe('or', () => {
  test('can create an "or" type', () => {
    const type = s.Or(s.str, s.num);
    expect(type).toEqual({
      kind: 'or',
      types: [{kind: 'str'}, {kind: 'num'}],
      discriminator: ['num', -1],
    });
  });
});

describe('const', () => {
  test('can create an "const" type', () => {
    const type = s.Const('Hello');
    const type2: ConstSchema<'Hello'> = type;
    expect(type2).toEqual({
      kind: 'con',
      value: 'Hello',
    });
  });
});
