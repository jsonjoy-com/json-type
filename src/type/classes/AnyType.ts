import type * as schema from '../../schema';
import {RandomJson} from '@jsonjoy.com/util/lib/json-random';
import type {ValidatorCodegenContext} from '../../codegen/validator/ValidatorCodegenContext';
import type {ValidationPath} from '../../codegen/validator/types';
import type {JsonTextEncoderCodegenContext} from '../../codegen/json/JsonTextEncoderCodegenContext';
import {CborEncoderCodegenContext} from '../../codegen/binary/CborEncoderCodegenContext';
import type {JsonEncoderCodegenContext} from '../../codegen/binary/JsonEncoderCodegenContext';
import type {BinaryEncoderCodegenContext} from '../../codegen/binary/BinaryEncoderCodegenContext';
import type {JsExpression} from '@jsonjoy.com/util/lib/codegen/util/JsExpression';
import {MessagePackEncoderCodegenContext} from '../../codegen/binary/MessagePackEncoderCodegenContext';
import {EncodingFormat} from '@jsonjoy.com/json-pack/lib/constants';
import type {BinaryJsonEncoder} from '@jsonjoy.com/json-pack/lib/types';
import type {CapacityEstimatorCodegenContext} from '../../codegen/capacity/CapacityEstimatorCodegenContext';
import {maxEncodingCapacity} from '@jsonjoy.com/util/lib/json-size';
import {AbstractType} from './AbstractType';
import type * as jsonSchema from '../../json-schema';
import type * as ts from '../../typescript/types';
import type {TypeExportContext} from '../../system/TypeExportContext';
import type * as jtd from '../../jtd/types';

export class AnyType extends AbstractType<schema.AnySchema> {
  constructor(protected schema: schema.AnySchema) {
    super();
  }

  public codegenValidator(ctx: ValidatorCodegenContext, path: ValidationPath, r: string): void {
    ctx.emitCustomValidators(this, path, r);
  }

  public codegenJsonTextEncoder(ctx: JsonTextEncoderCodegenContext, value: JsExpression): void {
    ctx.js(/* js */ `s += stringify(${value.use()});`);
  }

  private codegenBinaryEncoder(ctx: BinaryEncoderCodegenContext<BinaryJsonEncoder>, value: JsExpression): void {
    ctx.codegen.link('Value');
    const r = ctx.codegen.var(value.use());
    ctx.codegen.if(
      `${r} instanceof Value`,
      () => {
        ctx.codegen.if(
          `${r}.type`,
          () => {
            const type =
              ctx instanceof CborEncoderCodegenContext
                ? EncodingFormat.Cbor
                : ctx instanceof MessagePackEncoderCodegenContext
                  ? EncodingFormat.MsgPack
                  : EncodingFormat.Json;
            ctx.js(`${r}.type.encoder(${type})(${r}.data, encoder);`);
          },
          () => {
            ctx.js(/* js */ `encoder.writeAny(${r}.data);`);
          },
        );
      },
      () => {
        ctx.js(/* js */ `encoder.writeAny(${r});`);
      },
    );
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

  public toTypeScriptAst(): ts.TsType {
    return {node: 'AnyKeyword'};
  }
}
