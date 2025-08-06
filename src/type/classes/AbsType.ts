import {Value} from '../../value';
import type * as schema from '../../schema';
import type {Printable} from 'tree-dump/lib/types';
import type {TExample} from '../../schema';
import type {BaseType} from '../types';
import type {TypeSystem} from '../../system/TypeSystem';

export abstract class AbsType<S extends schema.Schema> implements BaseType<S>, Printable {
  /** Default type system to use, if any. */
  public system?: TypeSystem;

  public readonly validators: schema.TypeOf<S>[] = [];

  constructor(protected schema: S) {}

  public sys(system: TypeSystem | undefined): this {
    this.system = system;
    return this;
  }

  public getSystem(): TypeSystem {
    const system = this.system;
    if (!system) throw new Error('NO_SYSTEM');
    return system;
  }

  public kind(): S['kind'] {
    return this.schema.kind;
  }

  public value(data: schema.TypeOf<S>) {
    return new Value<this>(this, data as any);
  }

  /**
   * @todo Add ability to export the whole schema, including aliases.
   */
  public getSchema(): S {
    return this.schema;
  }

  /**
   * Sets a custom runtime validator for this type.
   *
   * @param validator Function that validates the value of this type.
   * @returns `this` for chaining.
   */
  public validator(validator: schema.TypeOf<S>): this {
    this.validators.push(validator);
    return this;
  }

  public options(options: schema.Optional<S>): this {
    Object.assign(this.schema, options);
    return this;
  }

  public title(title: string): this {
    this.schema.title = title;
    return this;
  }

  public intro(intro: string): this {
    this.schema.intro = intro;
    return this;
  }

  public description(description: string): this {
    this.schema.description = description;
    return this;
  }

  public default(value: schema.Schema['default']): this {
    this.schema.default = value;
    return this;
  }

  public example(
    value: schema.TypeOf<S>,
    title?: TExample['title'],
    options?: Omit<TExample, 'value' | 'title'>,
  ): this {
    const examples = (this.schema.examples ??= []);
    const example: TExample = {...options, value};
    if (typeof title === 'string') example.title = title;
    examples.push(example);
    return this;
  }

  public getOptions(): schema.Optional<S> {
    const {kind, ...options} = this.schema;
    return options as any;
  }

  // /** Validates own schema, throws on errors. */
  // public validateSchema(): void {
  //   const {validateSchema} = require('../../schema/validate');
  //   validateSchema(this.getSchema());
  // }

  // public validate(value: unknown): void {
  //   const validator = this.validator('string');
  //   const err = validator(value);
  //   if (err) throw new Error(JSON.parse(err as string)[0]);
  // }

  // public compileValidator(options: Partial<Omit<ValidatorCodegenContextOptions, 'type'>>): JsonTypeValidator {
  //   const ctx = new ValidatorCodegenContext({
  //     system: this.system,
  //     errors: 'object',
  //     ...options,
  //     type: this as any,
  //   });
  //   this.codegenValidator(ctx, [], ctx.codegen.options.args[0]);
  //   return ctx.compile();
  // }

  // private __compileValidator(kind: keyof Validators): JsonTypeValidator {
  //   return (this.validators[kind] = this.compileValidator({
  //     errors: kind,
  //     system: this.system,
  //     skipObjectExtraFieldsCheck: kind === 'boolean',
  //     unsafeMode: kind === 'boolean',
  //   }));
  // }

  // public validator(kind: keyof Validators): JsonTypeValidator {
  //   return this.validators[kind] || lazy(() => this.__compileValidator(kind));
  // }

  // protected compileJsonTextEncoder(options: Omit<JsonTextEncoderCodegenContextOptions, 'type'>): JsonEncoderFn {
  //   const ctx = new JsonTextEncoderCodegenContext({
  //     ...options,
  //     system: this.system,
  //     type: this as any,
  //   });
  //   const r = ctx.codegen.options.args[0];
  //   const value = new JsExpression(() => r);
  //   this.codegenJsonTextEncoder(ctx, value);
  //   return ctx.compile();
  // }

  // public codegenJsonTextEncoder(ctx: JsonTextEncoderCodegenContext, value: JsExpression): void {
  //   // Use the centralized router function
  //   const {generate} = require('../../codegen/json/jsonTextEncoders');
  //   generate(ctx, value, this as any);
  // }

  // private __jsonEncoder: JsonEncoderFn | undefined;
  // public jsonTextEncoder(): JsonEncoderFn {
  //   return (
  //     this.__jsonEncoder || (this.__jsonEncoder = lazy(() => (this.__jsonEncoder = this.compileJsonTextEncoder({}))))
  //   );
  // }

  // public compileEncoder(format: EncodingFormat, name?: string): CompiledBinaryEncoder {
  //   switch (format) {
  //     case EncodingFormat.Cbor: {
  //       const encoder = this.compileCborEncoder({name});
  //       this.encoders.set(EncodingFormat.Cbor, encoder);
  //       return encoder;
  //     }
  //     case EncodingFormat.MsgPack: {
  //       const encoder = this.compileMessagePackEncoder({name});
  //       this.encoders.set(EncodingFormat.MsgPack, encoder);
  //       return encoder;
  //     }
  //     case EncodingFormat.Json: {
  //       const encoder = this.compileJsonEncoder({name});
  //       this.encoders.set(EncodingFormat.Json, encoder);
  //       return encoder;
  //     }
  //     default:
  //       throw new Error(`Unsupported encoding format: ${format}`);
  //   }
  // }

  // public encoder(kind: EncodingFormat): CompiledBinaryEncoder {
  //   const encoders = this.encoders;
  //   const cachedEncoder = encoders.get(kind);
  //   if (cachedEncoder) return cachedEncoder;
  //   const temporaryWrappedEncoder = lazy(() => this.compileEncoder(kind));
  //   encoders.set(kind, temporaryWrappedEncoder);
  //   return temporaryWrappedEncoder;
  // }

  // public encode(codec: JsonValueCodec, value: unknown): Uint8Array {
  //   const encoder = this.encoder(codec.format);
  //   const writer = codec.encoder.writer;
  //   writer.reset();
  //   encoder(value, codec.encoder);
  //   return writer.flush();
  // }

  // public codegenValidator(ctx: ValidatorCodegenContext, path: ValidationPath, r: string): void {
  //   // Use the centralized router function
  //   const {generate} = require('../../codegen/validator/validators');
  //   generate(ctx, path, r, this as any);
  // }

  // public compileCborEncoder(
  //   options: Omit<CborEncoderCodegenContextOptions, 'type' | 'encoder'>,
  // ): CompiledBinaryEncoder {
  //   const ctx = new CborEncoderCodegenContext({
  //     system: this.system,
  //     encoder: new CborEncoder(),
  //     ...options,
  //     type: this as any,
  //   });
  //   const r = ctx.codegen.options.args[0];
  //   const value = new JsExpression(() => r);
  //   this.codegenCborEncoder(ctx, value);
  //   return ctx.compile();
  // }

  // public codegenCborEncoder(ctx: CborEncoderCodegenContext, value: JsExpression): void {
  //   // Use the centralized router function
  //   const {generate} = require('../../codegen/binary/cborEncoders');
  //   generate(ctx, value, this as any);
  // }

  // public compileMessagePackEncoder(
  //   options: Omit<MessagePackEncoderCodegenContextOptions, 'type' | 'encoder'>,
  // ): CompiledBinaryEncoder {
  //   const ctx = new MessagePackEncoderCodegenContext({
  //     system: this.system,
  //     encoder: new MsgPackEncoder(),
  //     ...options,
  //     type: this as any,
  //   });
  //   const r = ctx.codegen.options.args[0];
  //   const value = new JsExpression(() => r);
  //   this.codegenMessagePackEncoder(ctx, value);
  //   return ctx.compile();
  // }

  // public codegenMessagePackEncoder(ctx: MessagePackEncoderCodegenContext, value: JsExpression): void {
  //   // Use the centralized router function
  //   const {generate} = require('../../codegen/binary/messagePackEncoders');
  //   generate(ctx, value, this as any);
  // }

  // public compileJsonEncoder(
  //   options: Omit<JsonEncoderCodegenContextOptions, 'type' | 'encoder'>,
  // ): CompiledBinaryEncoder {
  //   const writer = new Writer();
  //   const ctx = new JsonEncoderCodegenContext({
  //     system: this.system,
  //     encoder: new JsonEncoder(writer),
  //     ...options,
  //     type: this as any,
  //   });
  //   const r = ctx.codegen.options.args[0];
  //   const value = new JsExpression(() => r);
  //   this.codegenJsonEncoder(ctx, value);
  //   return ctx.compile();
  // }

  // public codegenJsonEncoder(ctx: JsonEncoderCodegenContext, value: JsExpression): void {
  //   // Use the centralized router function
  //   const {generate} = require('../../codegen/binary/jsonEncoders');
  //   generate(ctx, value, this as any);
  // }

  // public codegenCapacityEstimator(ctx: CapacityEstimatorCodegen, value: JsExpression): void {
  //   // Use the centralized router function
  //   generate(ctx, value, this as any);
  // }

  // public compileCapacityEstimator(
  //   options: Omit<CapacityEstimatorCodegenOptions, 'type'>,
  // ): CompiledCapacityEstimator {
  //   const ctx = new CapacityEstimatorCodegen({
  //     system: this.system,
  //     ...options,
  //     type: this as any,
  //   });
  //   const r = ctx.codegen.options.args[0];
  //   const value = new JsExpression(() => r);
  //   // Use the centralized router instead of the abstract method
  //   generate(ctx, value, this as any);
  //   return ctx.compile();
  // }

  // private __capacityEstimator: CompiledCapacityEstimator | undefined;
  // public capacityEstimator(): CompiledCapacityEstimator {
  //   return (
  //     this.__capacityEstimator ||
  //     (this.__capacityEstimator = lazy(() => (this.__capacityEstimator = this.compileCapacityEstimator({}))))
  //   );
  // }

  // public random(): unknown {
  //   return random(this);
  // }

  // public toTypeScriptAst(): ts.TsType {
  //   // Use dynamic import to avoid circular dependency
  //   const converter = require('../../typescript/converter');
  //   return converter.toTypeScriptAst(this.getSchema());
  // }

  // public toJson(value: unknown, system: TypeSystem | undefined = this.system): json_string<unknown> {
  //   return JSON.stringify(value) as json_string<schema.TypeOf<S>>;
  // }

  protected toStringTitle(): string {
    return this.kind();
  }

  protected toStringOptions(): string {
    const options = this.getOptions() as schema.Display;
    const title = options.title || options.intro || options.description;
    if (!title) return '';
    return JSON.stringify(title);
  }

  public toString(tab: string = ''): string {
    const options = this.toStringOptions();
    return this.toStringTitle() + (options ? ` ${options}` : '');
  }

  // public toJtdForm(): jtd.JtdForm {
  //   // Use dynamic import to avoid circular dependency
  //   const converter = require('../../jtd/converter');
  //   return converter.toJtdForm(this.getSchema());
  // }
}
