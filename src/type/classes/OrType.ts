import * as schema from '../../schema';
import {printTree} from 'tree-dump/lib/printTree';
import {validateTType} from '../../schema/validate';
import type {ValidatorCodegenContext} from '../../codegen/validator/ValidatorCodegenContext';
import type {ValidationPath} from '../../codegen/validator/types';
import {ValidationError} from '../../constants';
import type {JsonTextEncoderCodegenContext} from '../../codegen/json/JsonTextEncoderCodegenContext';
import {CborEncoderCodegenContext} from '../../codegen/binary/CborEncoderCodegenContext';
import {JsonEncoderCodegenContext} from '../../codegen/binary/JsonEncoderCodegenContext';
import type {BinaryEncoderCodegenContext} from '../../codegen/binary/BinaryEncoderCodegenContext';
import type {JsExpression} from '@jsonjoy.com/util/lib/codegen/util/JsExpression';
import {MessagePackEncoderCodegenContext} from '../../codegen/binary/MessagePackEncoderCodegenContext';
import type {BinaryJsonEncoder} from '@jsonjoy.com/json-pack/lib/types';
import type {CapacityEstimatorCodegenContext} from '../../codegen/capacity/CapacityEstimatorCodegenContext';
import {JsonExpressionCodegen} from '@jsonjoy.com/json-expression';
import {operatorsMap} from '@jsonjoy.com/json-expression/lib/operators';
import {Vars} from '@jsonjoy.com/json-expression/lib/Vars';
import {Discriminator} from '../discriminator';
import {AbstractType} from './AbstractType';
import type * as jsonSchema from '../../json-schema';
import type {SchemaOf, Type} from '../types';
import type {TypeSystem} from '../../system/TypeSystem';
import type {json_string} from '@jsonjoy.com/util/lib/json-brand';
import type * as ts from '../../typescript/types';
import type {TypeExportContext} from '../../system/TypeExportContext';

export class OrType<T extends Type[]> extends AbstractType<schema.OrSchema<{[K in keyof T]: SchemaOf<T[K]>}>> {
  protected schema: schema.OrSchema<any>;

  constructor(
    protected types: T,
    options?: Omit<schema.OrSchema, 'kind' | 'type'>,
  ) {
    super();
    this.schema = {
      ...schema.s.Or(),
      ...options,
      discriminator: options?.discriminator ?? Discriminator.createExpression(types),
    };
  }

  public getSchema(): schema.OrSchema<{[K in keyof T]: SchemaOf<T[K]>}> {
    return {
      ...this.schema,
      types: this.types.map((type) => type.getSchema()) as any,
    };
  }

  public getOptions(): schema.Optional<schema.OrSchema<{[K in keyof T]: SchemaOf<T[K]>}>> {
    const {kind, types, ...options} = this.schema;
    return options as any;
  }

  public options(options: schema.Optional<schema.OrSchema> & Partial<Pick<schema.OrSchema, 'discriminator'>>): this {
    Object.assign(this.schema, options);
    return this;
  }

  private __discriminator: undefined | ((val: unknown) => number) = undefined;
  public discriminator(): (val: unknown) => number {
    if (this.__discriminator) return this.__discriminator;
    const expr = this.schema.discriminator;
    if (!expr || (expr[0] === 'num' && expr[1] === 0)) throw new Error('NO_DISCRIMINATOR');
    const codegen = new JsonExpressionCodegen({
      expression: expr,
      operators: operatorsMap,
    });
    const fn = codegen.run().compile();
    return (this.__discriminator = (data: unknown) => +(fn(new Vars(data)) as any));
  }

  public validateSchema(): void {
    const schema = this.getSchema();
    validateTType(schema, 'or');
    const {types, discriminator} = schema;
    if (!discriminator || (discriminator[0] === 'num' && discriminator[1] === -1)) throw new Error('DISCRIMINATOR');
    if (!Array.isArray(types)) throw new Error('TYPES_TYPE');
    if (!types.length) throw new Error('TYPES_LENGTH');
    for (const type of this.types) type.validateSchema();
  }

  public codegenValidator(ctx: ValidatorCodegenContext, path: ValidationPath, r: string): void {
    const types = this.types;
    const codegen = ctx.codegen;
    const length = types.length;
    if (length === 1) {
      types[0].codegenValidator(ctx, path, r);
      return;
    }
    const discriminator = this.discriminator();
    const d = codegen.linkDependency(discriminator);
    codegen.switch(
      `${d}(${r})`,
      types.map((type, index) => [
        index,
        () => {
          type.codegenValidator(ctx, path, r);
        },
      ]),
      () => {
        const err = ctx.err(ValidationError.OR, path);
        ctx.js(`return ${err}`);
      },
    );
  }

  public codegenJsonTextEncoder(ctx: JsonTextEncoderCodegenContext, value: JsExpression): void {
    ctx.js(/* js */ `s += stringify(${value.use()});`);
  }

  private codegenBinaryEncoder(ctx: BinaryEncoderCodegenContext<BinaryJsonEncoder>, value: JsExpression): void {
    const codegen = ctx.codegen;
    const discriminator = this.discriminator();
    const d = codegen.linkDependency(discriminator);
    const types = this.types;
    codegen.switch(
      `${d}(${value.use()})`,
      types.map((type, index) => [
        index,
        () => {
          if (ctx instanceof CborEncoderCodegenContext) type.codegenCborEncoder(ctx, value);
          else if (ctx instanceof MessagePackEncoderCodegenContext) type.codegenMessagePackEncoder(ctx, value);
          else if (ctx instanceof JsonEncoderCodegenContext) type.codegenJsonEncoder(ctx, value);
        },
      ]),
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

  public codegenCapacityEstimator(ctx: CapacityEstimatorCodegenContext, value: JsExpression): void {
    const codegen = ctx.codegen;
    const discriminator = this.discriminator();
    const d = codegen.linkDependency(discriminator);
    const types = this.types;
    codegen.switch(
      `${d}(${value.use()})`,
      types.map((type, index) => [
        index,
        () => {
          type.codegenCapacityEstimator(ctx, value);
        },
      ]),
    );
  }



  public toTypeScriptAst(): ts.TsUnionType {
    const node: ts.TsUnionType = {
      node: 'UnionType',
      types: this.types.map((t) => t.toTypeScriptAst()),
    };
    return node;
  }

  public toJson(value: unknown, system: TypeSystem | undefined = this.system): json_string<unknown> {
    return JSON.stringify(value) as json_string<unknown>;
  }

  public toString(tab: string = ''): string {
    return super.toString(tab) + printTree(tab, [...this.types.map((type) => (tab: string) => type.toString(tab))]);
  }
}
