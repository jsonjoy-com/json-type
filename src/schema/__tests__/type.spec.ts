import {type ObjSchema, s} from '..';

test('can generate any type', () => {
  const address: ObjSchema = {
    kind: 'obj',
    title: 'User address',
    description: 'Various address fields for user',
    keys: [...s.Object(s.prop('street', s.String()), s.prop('zip', s.String())).keys],
  };
  const userType = s.Object(
    s.prop('id', s.Number({format: 'i'})),
    s.prop('alwaysOne', s.Const<1>(1)),
    s.prop('name', s.String()),
    s.prop('address', address),
    s.prop('timeCreated', s.Number()),
    s.prop('tags', s.Array(s.Or(s.Number(), s.String()))),
    s.prop('elements', s.Map(s.str)),
  );

  expect(userType).toMatchObject({
    kind: 'obj',
    keys: [
      {
        key: 'id',
        value: {
          kind: 'num',
          format: 'i',
        },
      },
      {
        key: 'alwaysOne',
        value: {
          kind: 'con',
          value: 1,
        },
      },
      {
        key: 'name',
        value: {
          kind: 'str',
        },
      },
      {
        key: 'address',
        value: {
          kind: 'obj',
          title: 'User address',
          description: 'Various address fields for user',
          keys: [
            {
              key: 'street',
              value: {
                kind: 'str',
              },
            },
            {
              key: 'zip',
              value: {
                kind: 'str',
              },
            },
          ],
        },
      },
      {
        key: 'timeCreated',
        value: {
          kind: 'num',
        },
      },
      {
        key: 'tags',
        value: {
          kind: 'arr',
        },
      },
      {
        key: 'elements',
        value: {
          kind: 'map',
          value: {
            kind: 'str',
          },
        },
      },
    ],
  });
});
