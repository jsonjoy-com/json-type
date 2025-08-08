import {Writer} from '@jsonjoy.com/buffers/lib/Writer';
import {parse} from '@jsonjoy.com/json-pack/lib/json-binary';
import {JsonEncoder} from '@jsonjoy.com/json-pack/lib/json/JsonEncoder';
import {JsonDecoder} from '@jsonjoy.com/json-pack/lib/json/JsonDecoder';
import {TypeBuilder} from '../../../../type/TypeBuilder';
import {JsonCodegen} from '../JsonCodegen';
import {randomJson} from '../../../../__tests__/fixtures';

const encoder = new JsonEncoder(new Writer(16));
const decoder = new JsonDecoder();

test('can encode random values', () => {
  for (let i = 0; i < 100; i++) {
    const json = randomJson();
    const t = new TypeBuilder();
    const type = t.from(json);
    try {
      const fn = JsonCodegen.get(type);
      fn(json, encoder);
      const encoded = encoder.writer.flush();
      const decoded = parse(Buffer.from(encoded).toString('utf-8'));
      expect(decoded).toEqual(json);
    } catch (error) {
      console.log(JSON.stringify(json, null, 2));
      console.log(type + '');
      throw error;
    }
  }
});
