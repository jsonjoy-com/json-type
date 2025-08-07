import * as schema from '../../schema';
import {printTree} from 'tree-dump/lib/printTree';
import {JsonExpressionCodegen} from '@jsonjoy.com/json-expression';
import {operatorsMap} from '@jsonjoy.com/json-expression/lib/operators';
import {Vars} from '@jsonjoy.com/json-expression/lib/Vars';
import {Discriminator} from '../discriminator';
import {AbsType} from './AbsType';
import type {SchemaOf, Type} from '../types';

export class OrType<T extends Type[] = any> extends AbsType<schema.OrSchema<{[K in keyof T]: SchemaOf<T[K]>}>> {
  constructor(
    public types: T,
    options?: Omit<schema.OrSchema, 'kind' | 'type'>,
  ) {
    super({
      ...schema.s.Or(),
      ...options,
      discriminator: options?.discriminator ?? Discriminator.createExpression(types),
    } as any);
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
    const discriminator = options.discriminator;
    if (discriminator) {
      if(discriminator.length === 2 && discriminator[0] === 'num' && discriminator[1] === -1) {
        this.schema.discriminator = Discriminator.createExpression(this.types);
      }
    }
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

  // public codegenValidator(ctx: ValidatorCodegenContext, path: ValidationPath, r: string): void {
  //   const types = this.types;
  //   const codegen = ctx.codegen;
  //   const length = types.length;
  //   if (length === 1) {
  //     types[0].codegenValidator(ctx, path, r);
  //     return;
  //   }
  //   const discriminator = this.discriminator();
  //   const d = codegen.linkDependency(discriminator);
  //   codegen.switch(
  //     `${d}(${r})`,
  //     types.map((type, index) => [
  //       index,
  //       () => {
  //         type.codegenValidator(ctx, path, r);
  //       },
  //     ]),
  //     () => {
  //       const err = ctx.err(ValidationError.OR, path);
  //       ctx.js(`return ${err}`);
  //     },
  //   );
  // }

  // public codegenJsonTextEncoder(ctx: JsonTextEncoderCodegenContext, value: JsExpression): void {
  //   ctx.js(/* js */ `s += stringify(${value.use()});`);
  // }

  // private codegenBinaryEncoder(ctx: BinaryEncoderCodegenContext<BinaryJsonEncoder>, value: JsExpression): void {
  //   const codegen = ctx.codegen;
  //   const discriminator = this.discriminator();
  //   const d = codegen.linkDependency(discriminator);
  //   const types = this.types;
  //   codegen.switch(
  //     `${d}(${value.use()})`,
  //     types.map((type, index) => [
  //       index,
  //       () => {
  //         if (ctx instanceof CborEncoderCodegenContext) type.codegenCborEncoder(ctx, value);
  //         else if (ctx instanceof MessagePackEncoderCodegenContext) type.codegenMessagePackEncoder(ctx, value);
  //         else if (ctx instanceof JsonEncoderCodegenContext) type.codegenJsonEncoder(ctx, value);
  //       },
  //     ]),
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

  // public toJson(value: unknown, system: TypeSystem | undefined = this.system): json_string<unknown> {
  //   return JSON.stringify(value) as json_string<unknown>;
  // }

  public toString(tab: string = ''): string {
    return super.toString(tab) + printTree(tab, [...this.types.map((type) => (tab: string) => type.toString(tab))]);
  }
}
