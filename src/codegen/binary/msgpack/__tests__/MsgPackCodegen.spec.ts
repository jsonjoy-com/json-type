import {testBinaryCodegen} from '../../__tests__/testBinaryCodegen';
import {Writer} from '@jsonjoy.com/buffers/lib/Writer';
import {MsgPackEncoder} from '@jsonjoy.com/json-pack/lib/msgpack/MsgPackEncoder';
import {MsgPackDecoder} from '@jsonjoy.com/json-pack/lib/msgpack/MsgPackDecoder';
import {MsgPackCodegen} from '../MsgPackCodegen';
import type {ModuleType, Type} from '../../../../type';

const encoder = new MsgPackEncoder(new Writer(16));
const decoder = new MsgPackDecoder();

const transcode = (system: ModuleType, type: Type, value: unknown) => {
  const fn = MsgPackCodegen.get(type);
  encoder.writer.reset();
  fn(value, encoder);
  const encoded = encoder.writer.flush();
  const decoded = decoder.decode(encoded);
  return decoded;
};

testBinaryCodegen(transcode);
