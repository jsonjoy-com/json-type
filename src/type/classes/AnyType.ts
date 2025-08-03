import {AbsType} from './AbsType';
import type * as schema from '../../schema';

export class AnyType extends AbsType<schema.AnySchema> {
  // public codegenValidator(ctx: ValidatorCodegenContext, path: ValidationPath, r: string): void {
  //   ctx.emitCustomValidators(this, path, r);
  // }

  // public codegenJsonTextEncoder(ctx: JsonTextEncoderCodegenContext, value: JsExpression): void {
  //   ctx.js(/* js */ `s += stringify(${value.use()});`);
  // }

  // private codegenBinaryEncoder(ctx: BinaryEncoderCodegenContext<BinaryJsonEncoder>, value: JsExpression): void {
  //   ctx.codegen.link('Value');
  //   const r = ctx.codegen.var(value.use());
  //   ctx.codegen.if(
  //     `${r} instanceof Value`,
  //     () => {
  //       ctx.codegen.if(
  //         `${r}.type`,
  //         () => {
  //           const type =
  //             ctx instanceof CborEncoderCodegenContext
  //               ? EncodingFormat.Cbor
  //               : ctx instanceof MessagePackEncoderCodegenContext
  //                 ? EncodingFormat.MsgPack
  //                 : EncodingFormat.Json;
  //           ctx.js(`${r}.type.encoder(${type})(${r}.data, encoder);`);
  //         },
  //         () => {
  //           ctx.js(/* js */ `encoder.writeAny(${r}.data);`);
  //         },
  //       );
  //     },
  //     () => {
  //       ctx.js(/* js */ `encoder.writeAny(${r});`);
  //     },
  //   );
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
}
