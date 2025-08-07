import {testBinaryCodegen} from '../../__tests__/testBinaryCodegen';
import {JsonEncoder} from '@jsonjoy.com/json-pack/lib/json/JsonEncoder';
import {Writer} from '@jsonjoy.com/util/lib/buffers/Writer';
import {parse} from '@jsonjoy.com/json-pack/lib/json-binary';
import {JsonCodegen} from '../JsonCodegen';
import type {TypeSystem} from '../../../../system';
import type {Type} from '../../../../type';

const encoder = new JsonEncoder(new Writer(16));

const transcode = (system: TypeSystem, type: Type, value: unknown) => {
  const fn = JsonCodegen.get(type);
  encoder.writer.reset();
  fn(value, encoder);
  const encoded = encoder.writer.flush();
  const json = Buffer.from(encoded).toString('utf-8');
  // console.log(json);
  const decoded = parse(json);
  return decoded;
};

testBinaryCodegen(transcode);
