import * as schema from '../../schema';
import {printTree} from 'tree-dump/lib/printTree';
import {validateTType} from '../../schema/validate';
import type {ValidatorCodegenContext} from '../../codegen/validator/ValidatorCodegenContext';
import type {ValidationPath} from '../../codegen/validator/types';
import {ValidationError} from '../../constants';
import type {JsonTextEncoderCodegenContext} from '../../codegen/json/JsonTextEncoderCodegenContext';
import {CborEncoderCodegenContext} from '../../codegen/binary/CborEncoderCodegenContext';
import type {JsonEncoderCodegenContext} from '../../codegen/binary/JsonEncoderCodegenContext';
import {JsExpression} from '@jsonjoy.com/util/lib/codegen/util/JsExpression';
import type {MessagePackEncoderCodegenContext} from '../../codegen/binary/MessagePackEncoderCodegenContext';
import type {CapacityEstimatorCodegenContext} from '../../codegen/capacity/CapacityEstimatorCodegenContext';
import {MaxEncodingOverhead} from '@jsonjoy.com/util/lib/json-size';
import {AbstractType} from './AbstractType';
import type * as jsonSchema from '../../json-schema';
import type {SchemaOf, Type} from '../types';
import type {TypeSystem} from '../../system/TypeSystem';
import type {json_string} from '@jsonjoy.com/util/lib/json-brand';
import type * as ts from '../../typescript/types';
import type {TypeExportContext} from '../../system/TypeExportContext';

export class TupleType<T extends Type[]> extends AbstractType<schema.TupleSchema<{[K in keyof T]: SchemaOf<T[K]>}>> {
  protected schema: schema.TupleSchema<any>;

  constructor(
    public readonly types: T,
    options?: Omit<schema.TupleSchema, 'kind' | 'type'>,
  ) {
    super();
    this.schema = {...schema.s.Tuple(), ...options};
  }

  public getSchema(): schema.TupleSchema<{[K in keyof T]: SchemaOf<T[K]>}> {
    return {
      ...this.schema,
      types: this.types.map((type) => type.getSchema()) as any,
    };
  }

  public toJsonSchema(ctx?: TypeExportContext): jsonSchema.JsonSchemaArray {
    const jsonSchema = <jsonSchema.JsonSchemaArray>{
      type: 'array',
      prefixItems: this.types.map((type) => type.toJsonSchema(ctx)),
      items: false,
      ...super.toJsonSchema(ctx),
    };
    return jsonSchema;
  }

  public getOptions(): schema.Optional<schema.TupleSchema<{[K in keyof T]: SchemaOf<T[K]>}>> {
    const {kind, types, ...options} = this.schema;
    return options as any;
  }

  public validateSchema(): void {
    const schema = this.getSchema();
    validateTType(schema, 'tup');
    const {types} = schema;
    if (!Array.isArray(types)) throw new Error('TYPES_TYPE');
    if (!types.length) throw new Error('TYPES_LENGTH');
    for (const type of this.types) type.validateSchema();
  }

  public codegenValidator(ctx: ValidatorCodegenContext, path: ValidationPath, r: string): void {
    const err = ctx.err(ValidationError.TUP, path);
    const types = this.types;
    ctx.js(/* js */ `if (!Array.isArray(${r}) || ${r}.length !== ${types.length}) return ${err};`);
    for (let i = 0; i < this.types.length; i++) {
      const rv = ctx.codegen.getRegister();
      ctx.js(/* js */ `var ${rv} = ${r}[${i}];`);
      types[i].codegenValidator(ctx, [...path, i], rv);
    }
    ctx.emitCustomValidators(this, path, r);
  }

  public codegenJsonTextEncoder(ctx: JsonTextEncoderCodegenContext, value: JsExpression): void {
    ctx.writeText('[');
    const types = this.types;
    const length = types.length;
    const last = length - 1;
    for (let i = 0; i < last; i++) {
      types[i].codegenJsonTextEncoder(ctx, new JsExpression(() => `${value.use()}[${i}]`));
      ctx.writeText(',');
    }
    types[last].codegenJsonTextEncoder(ctx, new JsExpression(() => `${value.use()}[${last}]`));
    ctx.writeText(']');
  }

  private codegenBinaryEncoder(
    ctx: CborEncoderCodegenContext | MessagePackEncoderCodegenContext,
    value: JsExpression,
  ): void {
    const types = this.types;
    const length = types.length;
    ctx.blob(
      ctx.gen((encoder) => {
        encoder.writeArrHdr(length);
      }),
    );
    const r = ctx.codegen.r();
    ctx.js(/* js */ `var ${r} = ${value.use()};`);
    for (let i = 0; i < length; i++)
      if (ctx instanceof CborEncoderCodegenContext)
        types[i].codegenCborEncoder(ctx, new JsExpression(() => `${r}[${i}]`));
      else types[i].codegenMessagePackEncoder(ctx, new JsExpression(() => `${r}[${i}]`));
  }

  public codegenCborEncoder(ctx: CborEncoderCodegenContext, value: JsExpression): void {
    this.codegenBinaryEncoder(ctx, value);
  }

  public codegenMessagePackEncoder(ctx: MessagePackEncoderCodegenContext, value: JsExpression): void {
    this.codegenBinaryEncoder(ctx, value);
  }

  public codegenJsonEncoder(ctx: JsonEncoderCodegenContext, value: JsExpression): void {
    const codegen = ctx.codegen;
    const expr = new JsExpression(() => `${rItem}`);
    const r = codegen.var(value.use());
    const rItem = codegen.var();
    ctx.blob(
      ctx.gen((encoder) => {
        encoder.writeStartArr();
      }),
    );
    const types = this.types;
    const length = types.length;
    const arrSepBlob = ctx.gen((encoder) => {
      encoder.writeArrSeparator();
    });
    for (let i = 0; i < length; i++) {
      const type = types[i];
      const isLast = i === length - 1;
      codegen.js(`${rItem} = ${r}[${i}];`);
      type.codegenJsonEncoder(ctx, expr);
      if (!isLast) ctx.blob(arrSepBlob);
    }
    ctx.blob(
      ctx.gen((encoder) => {
        encoder.writeEndArr();
      }),
    );
  }

  public random(): unknown[] {
    return this.types.map((type) => type.random());
  }

  public toTypeScriptAst(): ts.TsTupleType {
    return {
      node: 'TupleType',
      elements: this.types.map((type) => type.toTypeScriptAst() as ts.TsType),
    };
  }

  public toJson(value: unknown, system: TypeSystem | undefined = this.system): json_string<unknown> {
    const types = this.types;
    const length = types.length;
    if (!length) return '[]' as json_string<unknown>;
    const last = length - 1;
    let str = '[';
    for (let i = 0; i < last; i++) str += (types[i] as any).toJson((value as unknown[])[i] as any, system) + ',';
    str += (types[last] as any).toJson((value as unknown[])[last] as any, system);
    return (str + ']') as json_string<unknown>;
  }

  public toString(tab: string = ''): string {
    return super.toString(tab) + printTree(tab, [...this.types.map((type) => (tab: string) => type.toString(tab))]);
  }
}
