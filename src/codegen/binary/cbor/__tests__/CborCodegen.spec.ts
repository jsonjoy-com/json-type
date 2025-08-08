import {testBinaryCodegen} from '../../__tests__/testBinaryCodegen';
import {Writer} from '@jsonjoy.com/buffers/lib/Writer';
import {CborEncoder} from '@jsonjoy.com/json-pack/lib/cbor/CborEncoder';
import {CborDecoder} from '@jsonjoy.com/json-pack/lib/cbor/CborDecoder';
import {CborCodegen} from '../CborCodegen';
import type {TypeSystem} from '../../../../system';
import type {Type} from '../../../../type';

const encoder = new CborEncoder(new Writer(16));
const decoder = new CborDecoder();

const transcode = (system: TypeSystem, type: Type, value: unknown) => {
  const fn = CborCodegen.get(type);
  encoder.writer.reset();
  fn(value, encoder);
  const encoded = encoder.writer.flush();
  const decoded = decoder.decode(encoded);
  return decoded;
};

testBinaryCodegen(transcode);
