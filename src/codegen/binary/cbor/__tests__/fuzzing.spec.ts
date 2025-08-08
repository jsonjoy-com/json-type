import {TypeBuilder} from '../../../../type/TypeBuilder';
import {Writer} from '@jsonjoy.com/buffers/lib/Writer';
import {CborEncoder} from '@jsonjoy.com/json-pack/lib/cbor/CborEncoder';
import {CborDecoder} from '@jsonjoy.com/json-pack/lib/cbor/CborDecoder';
import {CborCodegen} from '../CborCodegen';
import {randomJson} from '../../../../__tests__/fixtures';

const encoder = new CborEncoder(new Writer(16));
const decoder = new CborDecoder();

test('can encode random values', () => {
  for (let i = 0; i < 100; i++) {
    const json = randomJson();
    const t = new TypeBuilder();
    const type = t.from(json);
    try {
      const fn = CborCodegen.get(type);
      fn(json, encoder);
      const encoded = encoder.writer.flush();
      const decoded = decoder.decode(encoded);
      expect(decoded).toEqual(json);
    } catch (error) {
      console.log(JSON.stringify(json, null, 2));
      console.log(type + '');
      throw error;
    }
  }
});
