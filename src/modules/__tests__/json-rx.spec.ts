import {SchemaOf, t} from '../../type';
import {Message, NotificationMessage} from '../json-rx';

test('...', () => {
  console.log(NotificationMessage + '');
  type adasfsad = SchemaOf<typeof NotificationMessage.type>;
  type asdf = t.infer<typeof NotificationMessage.type>;
  // console.log(Message + '');
});
