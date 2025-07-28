import * as schema from '../../schema';
import {printTree} from 'tree-dump/lib/printTree';
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
import {ObjectFieldType} from './ObjectType';
import type * as jsonSchema from '../../json-schema';
import type {SchemaOf, Type} from '../types';
import type {TypeSystem} from '../../system/TypeSystem';
import type {json_string} from '@jsonjoy.com/util/lib/json-brand';
import type * as ts from '../../typescript/types';
import type {TypeExportContext} from '../../system/TypeExportContext';

// Helper type to extract the underlying type from either Type or ObjectFieldType
type TupleElement = Type | ObjectFieldType<any, any>;

// Helper type to extract the schema from a tuple element  
type SchemaOfTupleElement<T> = T extends ObjectFieldType<any, infer V> 
  ? SchemaOf<V> 
  : T extends Type 
    ? SchemaOf<T> 
    : never;

// Helper type for the schema mapping
type TupleSchemaMapping<T extends TupleElement[]> = {[K in keyof T]: SchemaOfTupleElement<T[K]>};

export class TupleType<T extends TupleElement[]> extends AbstractType<schema.TupleSchema<any>> {
  protected schema: schema.TupleSchema<any>;

  constructor(
    public readonly types: T,
    options?: Omit<schema.TupleSchema, 'kind' | 'type'>,
  ) {
    super();
    this.schema = {...schema.s.Tuple(), ...options};
  }

  public getSchema(): schema.TupleSchema<any> {
    return {
      ...this.schema,
      types: this.types.map((type) => {
        // If it's an ObjectFieldType, get the value type's schema, otherwise get the type's schema directly
        return type instanceof ObjectFieldType ? type.value.getSchema() : type.getSchema();
      }) as any,
    };
  }

  public getOptions(): schema.Optional<schema.TupleSchema<any>> {
    const {kind, types, ...options} = this.schema;
    return options as any;
  }

  public codegenValidator(ctx: ValidatorCodegenContext, path: ValidationPath, r: string): void {
    const err = ctx.err(ValidationError.TUP, path);
    const types = this.types;
    ctx.js(/* js */ `if (!Array.isArray(${r}) || ${r}.length !== ${types.length}) return ${err};`);
    for (let i = 0; i < this.types.length; i++) {
      const rv = ctx.codegen.getRegister();
      ctx.js(/* js */ `var ${rv} = ${r}[${i}];`);
      const type = types[i];
      // If it's an ObjectFieldType, validate the value type
      const typeToValidate = type instanceof ObjectFieldType ? type.value : type;
      typeToValidate.codegenValidator(ctx, [...path, i], rv);
    }
    ctx.emitCustomValidators(this, path, r);
  }

  public codegenJsonTextEncoder(ctx: JsonTextEncoderCodegenContext, value: JsExpression): void {
    ctx.writeText('[');
    const types = this.types;
    const length = types.length;
    const last = length - 1;
    for (let i = 0; i < last; i++) {
      const type = types[i];
      const typeToEncode = type instanceof ObjectFieldType ? type.value : type;
      typeToEncode.codegenJsonTextEncoder(ctx, new JsExpression(() => `${value.use()}[${i}]`));
      ctx.writeText(',');
    }
    const lastType = types[last];
    const lastTypeToEncode = lastType instanceof ObjectFieldType ? lastType.value : lastType;
    lastTypeToEncode.codegenJsonTextEncoder(ctx, new JsExpression(() => `${value.use()}[${last}]`));
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
    for (let i = 0; i < length; i++) {
      const type = types[i];
      const typeToEncode = type instanceof ObjectFieldType ? type.value : type;
      if (ctx instanceof CborEncoderCodegenContext)
        typeToEncode.codegenCborEncoder(ctx, new JsExpression(() => `${r}[${i}]`));
      else typeToEncode.codegenMessagePackEncoder(ctx, new JsExpression(() => `${r}[${i}]`));
    }
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
      const typeToEncode = type instanceof ObjectFieldType ? type.value : type;
      const isLast = i === length - 1;
      codegen.js(`${rItem} = ${r}[${i}];`);
      typeToEncode.codegenJsonEncoder(ctx, expr);
      if (!isLast) ctx.blob(arrSepBlob);
    }
    ctx.blob(
      ctx.gen((encoder) => {
        encoder.writeEndArr();
      }),
    );
  }

  public toJson(value: unknown, system: TypeSystem | undefined = this.system): json_string<unknown> {
    const types = this.types;
    const length = types.length;
    if (!length) return '[]' as json_string<unknown>;
    const last = length - 1;
    let str = '[';
    for (let i = 0; i < last; i++) {
      const type = types[i];
      const typeToEncode = type instanceof ObjectFieldType ? type.value : type;
      str += (typeToEncode as any).toJson((value as unknown[])[i] as any, system) + ',';
    }
    const lastType = types[last];
    const lastTypeToEncode = lastType instanceof ObjectFieldType ? lastType.value : lastType;
    str += (lastTypeToEncode as any).toJson((value as unknown[])[last] as any, system);
    return (str + ']') as json_string<unknown>;
  }

  public toString(tab: string = ''): string {
    return super.toString(tab) + printTree(tab, [
      ...this.types.map((type) => (tab: string) => {
        const typeToShow = type instanceof ObjectFieldType ? type.value : type;
        const key = type instanceof ObjectFieldType ? type.key : undefined;
        if (key) {
          return `"${key}": ${typeToShow.toString(tab)}`;
        }
        return typeToShow.toString(tab);
      })
    ]);
  }
}
