import {Writer} from '@jsonjoy.com/buffers/lib/Writer';
import {CborDecoder} from '@jsonjoy.com/json-pack/lib/cbor/CborDecoder';
import {CborEncoder} from '@jsonjoy.com/json-pack/lib/cbor/CborEncoder';
import type {Type} from '../../../../type';
import type {ModuleType} from '../../../../type/classes/ModuleType';
import {testBinaryCodegen} from '../../__tests__/testBinaryCodegen';
import {CborCodegen} from '../CborCodegen';

const encoder = new CborEncoder(new Writer(16));
const decoder = new CborDecoder();

const transcode = (system: ModuleType, type: Type, value: unknown) => {
  const fn = CborCodegen.get(type);
  encoder.writer.reset();
  fn(value, encoder);
  const encoded = encoder.writer.flush();
  const decoded = decoder.decode(encoded);
  return decoded;
};

testBinaryCodegen(transcode);
