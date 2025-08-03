import {AbsType} from './AbsType';
import type * as schema from '../../schema';

export class ConType<V = any> extends AbsType<schema.ConSchema<V>> {
  public literal() {
    return this.schema.value;
  }

  public getOptions(): schema.Optional<schema.ConSchema<V>> {
    const {kind, value, ...options} = this.schema;
    return options as any;
  }

  // public codegenValidator(ctx: ValidatorCodegenContext, path: ValidationPath, r: string): void {
  //   const value = this.schema.value;
  //   const equals = deepEqualCodegen(value);
  //   const fn = ctx.codegen.addConstant(equals);
  //   ctx.js(`if (!${fn}(${r})) return ${ctx.err(ValidationError.CONST, path)}`);
  //   ctx.emitCustomValidators(this, path, r);
  // }

  // public codegenJsonTextEncoder(ctx: JsonTextEncoderCodegenContext, value: JsExpression): void {
  //   ctx.writeText(JSON.stringify(this.schema.value));
  // }

  // private codegenBinaryEncoder(ctx: BinaryEncoderCodegenContext<BinaryJsonEncoder>, value: JsExpression): void {
  //   ctx.blob(
  //     ctx.gen((encoder) => {
  //       encoder.writeAny(this.schema.value);
  //     }),
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

  // public toJson(value: unknown, system: TypeSystem | undefined = this.system) {
  //   return this.__json;
  // }

  public toString(tab: string = ''): string {
    return `${super.toString(tab)} → ${JSON.stringify(this.schema.value)}`;
  }
}
