import {cloneBinary} from '@jsonjoy.com/util/lib/json-clone';
import {ValidationError} from '../../constants';
import {maxEncodingCapacity} from '@jsonjoy.com/util/lib/json-size';
import {AbstractType} from './AbstractType';
import {deepEqualCodegen} from '@jsonjoy.com/util/lib/json-equal/deepEqualCodegen';
import type * as schema from '../../schema';
import type {ValidatorCodegenContext} from '../../codegen/validator/ValidatorCodegenContext';
import type {ValidationPath} from '../../codegen/validator/types';
import type {JsonTextEncoderCodegenContext} from '../../codegen/json/JsonTextEncoderCodegenContext';
import type {CborEncoderCodegenContext} from '../../codegen/binary/CborEncoderCodegenContext';
import type {JsonEncoderCodegenContext} from '../../codegen/binary/JsonEncoderCodegenContext';
import type {BinaryEncoderCodegenContext} from '../../codegen/binary/BinaryEncoderCodegenContext';
import type {JsExpression} from '@jsonjoy.com/util/lib/codegen/util/JsExpression';
import type {MessagePackEncoderCodegenContext} from '../../codegen/binary/MessagePackEncoderCodegenContext';
import type {BinaryJsonEncoder} from '@jsonjoy.com/json-pack/lib/types';
import type {CapacityEstimatorCodegenContext} from '../../codegen/capacity/CapacityEstimatorCodegenContext';
import type * as jsonSchema from '../../json-schema';
import type {TypeSystem} from '../../system/TypeSystem';
import type {json_string} from '@jsonjoy.com/util/lib/json-brand';
import type * as ts from '../../typescript/types';
import type {TypeExportContext} from '../../system/TypeExportContext';
import type * as jtd from '../../jtd/types';

export class ConstType<V = any> extends AbstractType<schema.ConstSchema<V>> {
  private __json: json_string<V>;

  constructor(protected schema: schema.ConstSchema<any>) {
    super();
    this.__json = JSON.stringify(schema.value) as any;
  }

  public value() {
    return this.schema.value;
  }

  public getOptions(): schema.Optional<schema.ConstSchema<V>> {
    const { kind, value, ...options } = this.schema;
    return options as any;
  }

  public codegenValidator(ctx: ValidatorCodegenContext, path: ValidationPath, r: string): void {
    const value = this.schema.value;
    const equals = deepEqualCodegen(value);
    const fn = ctx.codegen.addConstant(equals);
    ctx.js(`if (!${fn}(${r})) return ${ctx.err(ValidationError.CONST, path)}`);
    ctx.emitCustomValidators(this, path, r);
  }

  public codegenJsonTextEncoder(
    ctx: JsonTextEncoderCodegenContext,
    value: JsExpression,
  ): void {
    ctx.writeText(JSON.stringify(this.schema.value));
  }

  private codegenBinaryEncoder(
    ctx: BinaryEncoderCodegenContext<BinaryJsonEncoder>,
    value: JsExpression,
  ): void {
    ctx.blob(
      ctx.gen((encoder) => {
        encoder.writeAny(this.schema.value);
      }),
    );
  }

  public codegenCborEncoder(
    ctx: CborEncoderCodegenContext,
    value: JsExpression,
  ): void {
    this.codegenBinaryEncoder(ctx, value);
  }

  public codegenMessagePackEncoder(
    ctx: MessagePackEncoderCodegenContext,
    value: JsExpression,
  ): void {
    this.codegenBinaryEncoder(ctx, value);
  }

  public codegenJsonEncoder(
    ctx: JsonEncoderCodegenContext,
    value: JsExpression,
  ): void {
    this.codegenBinaryEncoder(ctx, value);
  }

  public toTypeScriptAst() {
    const value = this.schema.value;
    if (value === null) {
      const node: ts.TsNullKeyword = { node: "NullKeyword" };
      return node;
    }
    switch (typeof value) {
      case "string": {
        const node: ts.TsStringLiteral = { node: "StringLiteral", text: value };
        return node;
      }
      case "number": {
        const node: ts.TsNumericLiteral = {
          node: "NumericLiteral",
          text: value.toString(),
        };
        return node;
      }
      case "boolean": {
        const node: ts.TsTrueKeyword | ts.TsFalseKeyword = {
          node: value ? "TrueKeyword" : "FalseKeyword",
        };
        return node;
      }
      case "object": {
        const node: ts.TsObjectKeyword = { node: "ObjectKeyword" };
        return node;
      }
      default: {
        const node: ts.TsUnknownKeyword = { node: "UnknownKeyword" };
        return node;
      }
    }
  }

  public toJson(value: unknown, system: TypeSystem | undefined = this.system) {
    return this.__json;
  }

  public toString(tab: string = ""): string {
    return `${super.toString(tab)} → ${JSON.stringify(this.schema.value)}`;
  }
}
