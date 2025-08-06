import * as schema from '../../schema';
import {AbsType} from './AbsType';
import type {SchemaOf, Type} from '../types';

export class RefType<T extends Type = any> extends AbsType<schema.RefSchema<SchemaOf<T>>> {
  constructor(ref: string) {
    super(schema.s.Ref<SchemaOf<T>>(ref));
  }

  public ref(): string {
    return this.schema.ref;
  }

  public getOptions(): schema.Optional<schema.RefSchema<SchemaOf<T>>> {
    const {kind, ref, ...options} = this.schema;
    return options as any;
  }

  // public codegenValidator(ctx: ValidatorCodegenContext, path: ValidationPath, r: string): void {
  //   const refErr = (errorRegister: string): string => {
  //     switch (ctx.options.errors) {
  //       case 'boolean':
  //         return errorRegister;
  //       case 'string': {
  //         return ctx.err(ValidationError.REF, [...path, {r: errorRegister}]);
  //       }
  //       // case 'object':
  //       default: {
  //         return ctx.err(ValidationError.REF, [...path], {
  //           refId: this.schema.ref,
  //           refError: errorRegister,
  //         });
  //       }
  //     }
  //   };
  //   const system = ctx.options.system || this.system;
  //   if (!system) throw new Error('NO_SYSTEM');
  //   const validator = system.resolve(this.schema.ref).type.validator(ctx.options.errors!);
  //   const d = ctx.codegen.linkDependency(validator);
  //   const rerr = ctx.codegen.getRegister();
  //   ctx.js(/* js */ `var ${rerr} = ${d}(${r});`);
  //   ctx.js(/* js */ `if (${rerr}) return ${refErr(rerr)};`);
  // }

  // public codegenJsonTextEncoder(ctx: JsonTextEncoderCodegenContext, value: JsExpression): void {
  //   const system = ctx.options.system || this.system;
  //   if (!system) throw new Error('NO_SYSTEM');
  //   const encoder = system.resolve(this.schema.ref).type.jsonTextEncoder();
  //   const d = ctx.codegen.linkDependency(encoder);
  //   ctx.js(/* js */ `s += ${d}(${value.use()});`);
  // }

  // private codegenBinaryEncoder(ctx: BinaryEncoderCodegenContext<BinaryJsonEncoder>, value: JsExpression): void {
  //   const system = ctx.options.system || this.system;
  //   if (!system) throw new Error('NO_SYSTEM');
  //   const kind =
  //     ctx instanceof CborEncoderCodegenContext
  //       ? EncodingFormat.Cbor
  //       : ctx instanceof MessagePackEncoderCodegenContext
  //         ? EncodingFormat.MsgPack
  //         : EncodingFormat.Json;
  //   const targetType = system.resolve(this.schema.ref).type;
  //   switch (targetType.kind()) {
  //     case 'str':
  //     case 'bool':
  //     case 'num':
  //     case 'any':
  //     // case 'tup': {
  //     //   if (ctx instanceof CborEncoderCodegenContext) targetType.codegenCborEncoder(ctx, value);
  //     //   else if (ctx instanceof MessagePackEncoderCodegenContext) targetType.codegenMessagePackEncoder(ctx, value);
  //     //   else if (ctx instanceof JsonEncoderCodegenContext) targetType.codegenJsonEncoder(ctx, value);
  //     //   break;
  //     // }
  //     default: {
  //       const encoder = targetType.encoder(kind) as CompiledBinaryEncoder;
  //       const d = ctx.codegen.linkDependency(encoder);
  //       ctx.js(/* js */ `${d}(${value.use()}, encoder);`);
  //     }
  //   }
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
  //   if (!system) return 'null' as json_string<unknown>;
  //   const alias = system.resolve(this.schema.ref);
  //   return alias.type.toJson(value, system) as json_string<unknown>;
  // }

  public toStringTitle(tab: string = ''): string {
    const options = this.toStringOptions();
    return `${super.toStringTitle()} → [${this.schema.ref}]` + (options ? ` ${options}` : '');
  }
}
