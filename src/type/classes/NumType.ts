import {floats, ints, uints} from '../../util';
import {ValidationError} from '../../constants';
import {AbsType} from './AbsType';
import type {ValidatorCodegenContext} from '../../codegen/validator/ValidatorCodegenContext';
import type {ValidationPath} from '../../codegen/validator/types';
import type {JsonTextEncoderCodegenContext} from '../../codegen/json/JsonTextEncoderCodegenContext';
import type {CborEncoderCodegenContext} from '../../codegen/binary/CborEncoderCodegenContext';
import type {JsonEncoderCodegenContext} from '../../codegen/binary/JsonEncoderCodegenContext';
import type {BinaryEncoderCodegenContext} from '../../codegen/binary/BinaryEncoderCodegenContext';
import type {JsExpression} from '@jsonjoy.com/util/lib/codegen/util/JsExpression';
import type {MessagePackEncoderCodegenContext} from '../../codegen/binary/MessagePackEncoderCodegenContext';
import type {BinaryJsonEncoder} from '@jsonjoy.com/json-pack/lib/types';
import type {TypeSystem} from '../../system/TypeSystem';
import type {json_string} from '@jsonjoy.com/util/lib/json-brand';
import type * as ts from '../../typescript/types';
import type * as schema from '../../schema';
import type * as jtd from '../../jtd/types';

export class NumType extends AbsType<schema.NumberSchema> {
  constructor(protected schema: schema.NumberSchema) {
    super();
  }

  public format(format: schema.NumberSchema['format']): this {
    this.schema.format = format;
    return this;
  }

  public gt(gt: schema.NumberSchema['gt']): this {
    this.schema.gt = gt;
    return this;
  }

  public gte(gte: schema.NumberSchema['gte']): this {
    this.schema.gte = gte;
    return this;
  }

  public lt(lt: schema.NumberSchema['lt']): this {
    this.schema.lt = lt;
    return this;
  }

  public lte(lte: schema.NumberSchema['lte']): this {
    this.schema.lte = lte;
    return this;
  }

  public codegenValidator(ctx: ValidatorCodegenContext, path: ValidationPath, r: string): void {
    const {format, gt, gte, lt, lte} = this.schema;
    if (format && ints.has(format)) {
      const errInt = ctx.err(ValidationError.INT, path);
      ctx.js(/* js */ `if(!Number.isInteger(${r})) return ${errInt};`);
      if (uints.has(format)) {
        const err = ctx.err(ValidationError.UINT, path);
        ctx.js(/* js */ `if(${r} < 0) return ${err};`);
        switch (format) {
          case 'u8': {
            ctx.js(/* js */ `if(${r} > 0xFF) return ${err};`);
            break;
          }
          case 'u16': {
            ctx.js(/* js */ `if(${r} > 0xFFFF) return ${err};`);
            break;
          }
          case 'u32': {
            ctx.js(/* js */ `if(${r} > 0xFFFFFFFF) return ${err};`);
            break;
          }
        }
      } else {
        switch (format) {
          case 'i8': {
            ctx.js(/* js */ `if(${r} > 0x7F || ${r} < -0x80) return ${errInt};`);
            break;
          }
          case 'i16': {
            ctx.js(/* js */ `if(${r} > 0x7FFF || ${r} < -0x8000) return ${errInt};`);
            break;
          }
          case 'i32': {
            ctx.js(/* js */ `if(${r} > 0x7FFFFFFF || ${r} < -0x80000000) return ${errInt};`);
            break;
          }
        }
      }
    } else if (floats.has(format)) {
      const err = ctx.err(ValidationError.NUM, path);
      ctx.codegen.js(/* js */ `if(!Number.isFinite(${r})) return ${err};`);
    } else {
      const err = ctx.err(ValidationError.NUM, path);
      ctx.codegen.js(/* js */ `if(typeof ${r} !== "number") return ${err};`);
    }
    if (gt !== undefined) {
      const err = ctx.err(ValidationError.GT, path);
      ctx.codegen.js(/* js */ `if(${r} <= ${gt}) return ${err};`);
    }
    if (gte !== undefined) {
      const err = ctx.err(ValidationError.GTE, path);
      ctx.codegen.js(/* js */ `if(${r} < ${gte}) return ${err};`);
    }
    if (lt !== undefined) {
      const err = ctx.err(ValidationError.LT, path);
      ctx.codegen.js(/* js */ `if(${r} >= ${lt}) return ${err};`);
    }
    if (lte !== undefined) {
      const err = ctx.err(ValidationError.LTE, path);
      ctx.codegen.js(/* js */ `if(${r} > ${lte}) return ${err};`);
    }
    ctx.emitCustomValidators(this, path, r);
  }

  public codegenJsonTextEncoder(ctx: JsonTextEncoderCodegenContext, value: JsExpression): void {
    ctx.js(/* js */ `s += ${value.use()};`);
  }

  private codegenBinaryEncoder(ctx: BinaryEncoderCodegenContext<BinaryJsonEncoder>, value: JsExpression): void {
    const {format} = this.schema;
    const v = value.use();
    if (uints.has(format)) ctx.js(/* js */ `encoder.writeUInteger(${v});`);
    else if (ints.has(format)) ctx.js(/* js */ `encoder.writeInteger(${v});`);
    else if (floats.has(format)) ctx.js(/* js */ `encoder.writeFloat(${v});`);
    else ctx.js(/* js */ `encoder.writeNumber(${v});`);
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

  public toJson(value: unknown, system: TypeSystem | undefined = this.system) {
    return ('' + value) as json_string<number>;
  }
}
