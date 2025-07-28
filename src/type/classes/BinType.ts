import {printTree} from 'tree-dump/lib/printTree';
import * as schema from '../../schema';
import {stringifyBinary} from '@jsonjoy.com/json-pack/lib/json-binary';
import {AbsType} from './AbsType';
import {ValidationError} from '../../constants';
import type {JsExpression} from '@jsonjoy.com/util/lib/codegen/util/JsExpression';
import type {BinaryJsonEncoder} from '@jsonjoy.com/json-pack/lib/types';
import type {ValidatorCodegenContext} from '../../codegen/validator/ValidatorCodegenContext';
import type {ValidationPath} from '../../codegen/validator/types';
import type {JsonTextEncoderCodegenContext} from '../../codegen/json/JsonTextEncoderCodegenContext';
import type {CborEncoderCodegenContext} from '../../codegen/binary/CborEncoderCodegenContext';
import type {JsonEncoderCodegenContext} from '../../codegen/binary/JsonEncoderCodegenContext';
import type {BinaryEncoderCodegenContext} from '../../codegen/binary/BinaryEncoderCodegenContext';
import type {MessagePackEncoderCodegenContext} from '../../codegen/binary/MessagePackEncoderCodegenContext';
import type {SchemaOf, Type} from '../types';
import type {TypeSystem} from '../../system/TypeSystem';
import type {json_string} from '@jsonjoy.com/util/lib/json-brand';
import type * as ts from '../../typescript/types';

export class BinType<T extends Type> extends AbsType<schema.BinarySchema> {
  protected schema: schema.BinarySchema;

  constructor(
    protected type: T,
    options?: schema.Optional<schema.BinarySchema>,
  ) {
    super();
    this.schema = schema.s.Binary(schema.s.any, options);
  }

  public format(format: schema.BinarySchema['format']): this {
    this.schema.format = format;
    return this;
  }

  public min(min: schema.BinarySchema['min']): this {
    this.schema.min = min;
    return this;
  }

  public max(max: schema.BinarySchema['max']): this {
    this.schema.max = max;
    return this;
  }

  public getSchema(): schema.BinarySchema<SchemaOf<T>> {
    return {
      ...this.schema,
      type: this.type.getSchema() as any,
    };
  }

  public getOptions(): schema.Optional<schema.ArraySchema<SchemaOf<T>>> {
    const {kind, type, ...options} = this.schema;
    return options as any;
  }

  public codegenValidator(ctx: ValidatorCodegenContext, path: ValidationPath, r: string): void {
    const hasBuffer = typeof Buffer === 'function';
    const err = ctx.err(ValidationError.BIN, path);
    ctx.js(
      // prettier-ignore
      `if(!(${r} instanceof Uint8Array)${hasBuffer ? ` && !Buffer.isBuffer(${r})` : ''}) return ${err};`,
    );
    const {min, max} = this.schema;
    if (typeof min === 'number' && min === max) {
      const err = ctx.err(ValidationError.BIN_LEN, path);
      ctx.js(`if(${r}.length !== ${min}) return ${err};`);
    } else {
      if (typeof min === 'number') {
        const err = ctx.err(ValidationError.BIN_LEN, path);
        ctx.js(`if(${r}.length < ${min}) return ${err};`);
      }
      if (typeof max === 'number') {
        const err = ctx.err(ValidationError.BIN_LEN, path);
        ctx.js(`if(${r}.length > ${max}) return ${err};`);
      }
    }
    ctx.emitCustomValidators(this, path, r);
  }

  public codegenJsonTextEncoder(ctx: JsonTextEncoderCodegenContext, value: JsExpression): void {
    ctx.linkBase64();
    ctx.writeText('"data:application/octet-stream;base64,');
    ctx.js(/* js */ `s += toBase64(${value.use()});`);
    ctx.writeText('"');
  }

  private codegenBinaryEncoder(ctx: BinaryEncoderCodegenContext<BinaryJsonEncoder>, value: JsExpression): void {
    ctx.js(/* js */ `encoder.writeBin(${value.use()});`);
  }

  public codegenCborEncoder(ctx: CborEncoderCodegenContext, value: JsExpression): void {
    this.codegenBinaryEncoder(ctx, value);
  }

  public codegenMessagePackEncoder(ctx: MessagePackEncoderCodegenContext, value: JsExpression): void {
    this.codegenBinaryEncoder(ctx, value);
  }

  public codegenJsonEncoder(ctx: JsonEncoderCodegenContext, value: JsExpression): void {
    this.codegenBinaryEncoder(ctx, value);
  }

  public toJson(value: unknown, system: TypeSystem | undefined = this.system): json_string<unknown> {
    return ('"' + stringifyBinary(value as Uint8Array) + '"') as json_string<unknown>;
  }

  public toString(tab: string = ''): string {
    return super.toString(tab) + printTree(tab, [(tab) => this.type.toString(tab)]);
  }
}
