import {Writer} from '@jsonjoy.com/buffers/lib/Writer';
import {parse} from '@jsonjoy.com/json-pack/lib/json-binary';
import {JsonEncoder} from '@jsonjoy.com/json-pack/lib/json/JsonEncoder';
import type {Type} from '../../../../type';
import type {ModuleType} from '../../../../type/classes/ModuleType';
import {testBinaryCodegen} from '../../__tests__/testBinaryCodegen';
import {JsonCodegen} from '../JsonCodegen';

const encoder = new JsonEncoder(new Writer(16));

const transcode = (system: ModuleType, type: Type, value: unknown) => {
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
