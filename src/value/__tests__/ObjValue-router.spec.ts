import {createRouter} from './ObjValue.fixtures';

test('can retrieve field as Value', async () => {
  const log = jest.fn();
  const router = createRouter({log});
  console.log(router + '');
  console.log(router.fn('log.message') + '');
  console.log(router.fn('log.message').data);
  console.log(router.fn('log.message').type + '');
  const result = await router.fn('log.message').exec({message: 'asdf'});
  expect(result.data).toEqual({time: expect.any(Number)});
});
