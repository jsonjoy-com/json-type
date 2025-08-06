import {printTree} from 'tree-dump/lib/printTree';
import * as schema from '../../schema';
import {AbsType} from './AbsType';
import type {SchemaOf, Type} from '../types';

export class BinType<T extends Type = any> extends AbsType<schema.BinSchema> {
  constructor(
    protected type: T,
    options?: schema.Optional<schema.BinSchema>,
  ) {
    super(schema.s.Binary(schema.s.any, options));
  }

  public format(format: schema.BinSchema['format']): this {
    this.schema.format = format;
    return this;
  }

  public min(min: schema.BinSchema['min']): this {
    this.schema.min = min;
    return this;
  }

  public max(max: schema.BinSchema['max']): this {
    this.schema.max = max;
    return this;
  }

  public getSchema(): schema.BinSchema<SchemaOf<T>> {
    return {
      ...this.schema,
      type: this.type.getSchema() as any,
    };
  }

  public getOptions(): schema.Optional<schema.ArrSchema<SchemaOf<T>>> {
    const {kind, type, ...options} = this.schema;
    return options as any;
  }

  // public codegenValidator(ctx: ValidatorCodegenContext, path: ValidationPath, r: string): void {
  //   const hasBuffer = typeof Buffer === 'function';
  //   const err = ctx.err(ValidationError.BIN, path);
  //   ctx.js(
  //     // prettier-ignore
  //     `if(!(${r} instanceof Uint8Array)${hasBuffer ? ` && !Buffer.isBuffer(${r})` : ''}) return ${err};`,
  //   );
  //   const {min, max} = this.schema;
  //   if (typeof min === 'number' && min === max) {
  //     const err = ctx.err(ValidationError.BIN_LEN, path);
  //     ctx.js(`if(${r}.length !== ${min}) return ${err};`);
  //   } else {
  //     if (typeof min === 'number') {
  //       const err = ctx.err(ValidationError.BIN_LEN, path);
  //       ctx.js(`if(${r}.length < ${min}) return ${err};`);
  //     }
  //     if (typeof max === 'number') {
  //       const err = ctx.err(ValidationError.BIN_LEN, path);
  //       ctx.js(`if(${r}.length > ${max}) return ${err};`);
  //     }
  //   }
  //   ctx.emitCustomValidators(this, path, r);
  // }

  // public codegenJsonTextEncoder(ctx: JsonTextEncoderCodegenContext, value: JsExpression): void {
  //   ctx.linkBase64();
  //   ctx.writeText('"data:application/octet-stream;base64,');
  //   ctx.js(/* js */ `s += toBase64(${value.use()});`);
  //   ctx.writeText('"');
  // }

  // private codegenBinaryEncoder(ctx: BinaryEncoderCodegenContext<BinaryJsonEncoder>, value: JsExpression): void {
  //   ctx.js(/* js */ `encoder.writeBin(${value.use()});`);
  // }

  // public codegenCborEncoder(ctx: CborEncoderCodegenContext, value: JsExpression): void {
  //   this.codegenBinaryEncoder(ctx, value);
  // }

  // public codegenMessagePackEncoder(ctx: MessagePackEncoderCodegenContext, value: JsExpression): void {
  //   this.codegenBinaryEncoder(ctx, value);
  // }

  // public codegenJsonEncoder(ctx: JsonEncoderCodegenContext, value: JsExpression): void {
  //   this.codegenBinaryEncoder(ctx, value);
  // }

  // public toJson(value: unknown, system: TypeSystem | undefined = this.system): json_string<unknown> {
  //   return ('"' + stringifyBinary(value as Uint8Array) + '"') as json_string<unknown>;
  // }

  public toString(tab: string = ''): string {
    return super.toString(tab) + printTree(tab, [(tab) => this.type.toString(tab)]);
  }
}
