import type * as schema from '../../schema';
import {RandomJson} from '@jsonjoy.com/util/lib/json-random';
import {asString} from '@jsonjoy.com/util/lib/strings/asString';
import {validateMinMax, validateTType, validateWithValidator} from '../../schema/validate';
import {AbstractType} from './AbstractType';
import {isAscii, isUtf8} from '../../util/stringFormats';
import {ValidationError} from '../../constants';
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
import type * as jtd from '../../jtd/types';

export class StringType extends AbstractType<schema.StringSchema> {
  constructor(protected schema: schema.StringSchema) {
    super();
  }

  public format(format: schema.StringSchema['format']): this {
    this.schema.format = format;
    return this;
  }

  public min(min: schema.StringSchema['min']): this {
    this.schema.min = min;
    return this;
  }

  public max(max: schema.StringSchema['max']): this {
    this.schema.max = max;
    return this;
  }

  public validateSchema(): void {
    const schema = this.getSchema();
    validateTType(schema, 'str');
    validateWithValidator(schema);
    const {min, max, ascii, noJsonEscape, format} = schema;
    validateMinMax(min, max);
    if (ascii !== undefined) {
      if (typeof ascii !== 'boolean') throw new Error('ASCII');
    }
    if (noJsonEscape !== undefined) {
      if (typeof noJsonEscape !== 'boolean') throw new Error('NO_JSON_ESCAPE_TYPE');
    }
    if (format !== undefined) {
      if (format !== 'ascii' && format !== 'utf8') {
        throw new Error('INVALID_STRING_FORMAT');
      }
      // If both format and ascii are specified, they should be consistent
      if (ascii !== undefined && format === 'ascii' && !ascii) {
        throw new Error('FORMAT_ASCII_MISMATCH');
      }
    }
  }

  public codegenValidator(ctx: ValidatorCodegenContext, path: ValidationPath, r: string): void {
    const error = ctx.err(ValidationError.STR, path);
    ctx.js(/* js */ `if(typeof ${r} !== "string") return ${error};`);
    const {min, max, format, ascii} = this.schema;
    if (typeof min === 'number' && min === max) {
      const err = ctx.err(ValidationError.STR_LEN, path);
      ctx.js(/* js */ `if(${r}.length !== ${min}) return ${err};`);
    } else {
      if (typeof min === 'number') {
        const err = ctx.err(ValidationError.STR_LEN, path);
        ctx.js(/* js */ `if(${r}.length < ${min}) return ${err};`);
      }
      if (typeof max === 'number') {
        const err = ctx.err(ValidationError.STR_LEN, path);
        ctx.js(/* js */ `if(${r}.length > ${max}) return ${err};`);
      }
    }

    if (format) {
      const formatErr = ctx.err(ValidationError.STR, path);
      if (format === 'ascii') {
        const validateFn = ctx.codegen.linkDependency(isAscii);
        ctx.js(/* js */ `if(!${validateFn}(${r})) return ${formatErr};`);
      } else if (format === 'utf8') {
        const validateFn = ctx.codegen.linkDependency(isUtf8);
        ctx.js(/* js */ `if(!${validateFn}(${r})) return ${formatErr};`);
      }
    } else if (ascii) {
      const asciiErr = ctx.err(ValidationError.STR, path);
      const validateFn = ctx.codegen.linkDependency(isAscii);
      ctx.js(/* js */ `if(!${validateFn}(${r})) return ${asciiErr};`);
    }

    ctx.emitCustomValidators(this, path, r);
  }

  public codegenJsonTextEncoder(ctx: JsonTextEncoderCodegenContext, value: JsExpression): void {
    if (this.schema.noJsonEscape) {
      ctx.writeText('"');
      ctx.js(/* js */ `s += ${value.use()};`);
      ctx.writeText('"');
    } else ctx.js(/* js */ `s += asString(${value.use()});`);
  }

  private codegenBinaryEncoder(ctx: BinaryEncoderCodegenContext<BinaryJsonEncoder>, value: JsExpression): void {
    const {ascii, format} = this.schema;
    const v = value.use();
    // Use ASCII encoding if format is 'ascii' or ascii=true (backward compatibility)
    const useAscii = format === 'ascii' || ascii;
    if (useAscii) ctx.js(/* js */ `encoder.writeAsciiStr(${v});`);
    else ctx.js(/* js */ `encoder.writeStr(${v});`);
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

  public random(): string {
    let length = Math.round(Math.random() * 10);
    const {min, max} = this.schema;
    if (min !== undefined && length < min) length = min + length;
    if (max !== undefined && length > max) length = max;
    return RandomJson.genString(length);
  }

  public toTypeScriptAst(): ts.TsStringKeyword {
    return {node: 'StringKeyword'};
  }

  public toJson(value: unknown, system: TypeSystem | undefined = this.system): json_string<unknown> {
    return <json_string<string>>(this.schema.noJsonEscape ? '"' + value + '"' : asString(value as string));
  }

  public toJtdForm(): jtd.JtdTypeForm {
    return {type: 'string'};
  }
}
