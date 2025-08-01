import {JsExpression} from '@jsonjoy.com/util/lib/codegen/util/JsExpression';
import {asString} from '@jsonjoy.com/util/lib/strings/asString';
import {printTree} from 'tree-dump/lib/printTree';
import * as schema from '../../schema';
import {ValidationError} from '../../constants';
import {CborEncoderCodegenContext} from '../../codegen/binary/CborEncoderCodegenContext';
import {MessagePackEncoderCodegenContext} from '../../codegen/binary/MessagePackEncoderCodegenContext';
import {AbsType} from './AbsType';
import type {BinaryJsonEncoder} from '@jsonjoy.com/json-pack/lib/types';
import type {JsonEncoderCodegenContext} from '../../codegen/binary/JsonEncoderCodegenContext';
import type {BinaryEncoderCodegenContext} from '../../codegen/binary/BinaryEncoderCodegenContext';
import type {ValidatorCodegenContext} from '../../codegen/validator/ValidatorCodegenContext';
import type {ValidationPath} from '../../codegen/validator/types';
import type {JsonTextEncoderCodegenContext} from '../../codegen/json/JsonTextEncoderCodegenContext';
import type {SchemaOf, Type} from '../types';
import type {TypeSystem} from '../../system/TypeSystem';
import type {json_string} from '@jsonjoy.com/util/lib/json-brand';
import type * as ts from '../../typescript/types';
import type {TypeExportContext} from '../../system/TypeExportContext';

export class MapType<T extends Type> extends AbsType<schema.MapSchema<SchemaOf<T>>> {
  protected schema: schema.MapSchema<any>;

  constructor(
    protected valueType: T,
    protected keyType?: Type,
    options?: schema.Optional<schema.MapSchema>,
  ) {
    super();
    this.schema = {kind: 'map', value: schema.s.any, ...(keyType && {key: schema.s.any}), ...options};
  }

  public getSchema(ctx?: TypeExportContext): schema.MapSchema<SchemaOf<T>> {
    return {
      ...this.schema,
      value: this.valueType.getSchema(ctx) as any,
      ...(this.keyType && {key: this.keyType.getSchema(ctx) as any}),
    };
  }

  public getOptions(): schema.Optional<schema.MapSchema<SchemaOf<T>>> {
    const {kind, value, key, ...options} = this.schema;
    return options as any;
  }

  public codegenValidator(ctx: ValidatorCodegenContext, path: ValidationPath, r: string): void {
    const err = ctx.err(ValidationError.MAP, path);
    ctx.js(`if (!${r} || (typeof ${r} !== 'object') || (${r}.constructor !== Object)) return ${err};`);
    const rKeys = ctx.codegen.var(`Object.keys(${r});`);
    const rLength = ctx.codegen.var(`${rKeys}.length`);
    const rKey = ctx.codegen.r();
    const rValue = ctx.codegen.r();
    ctx.js(`for (var ${rKey}, ${rValue}, i = 0; i < ${rLength}; i++) {`);
    ctx.js(`${rKey} = ${rKeys}[i];`);
    ctx.js(`${rValue} = ${r}[${rKey}];`);
    this.valueType.codegenValidator(ctx, [...path, {r: rKey}], rValue);
    ctx.js(`}`);
    ctx.emitCustomValidators(this, path, r);
  }

  public codegenJsonTextEncoder(ctx: JsonTextEncoderCodegenContext, value: JsExpression): void {
    ctx.writeText('{');
    const r = ctx.codegen.var(value.use());
    const rKeys = ctx.codegen.var(`Object.keys(${r})`);
    const rLength = ctx.codegen.var(`${rKeys}.length`);
    const rKey = ctx.codegen.var();
    ctx.codegen.if(`${rLength}`, () => {
      ctx.js(`${rKey} = ${rKeys}[0];`);
      ctx.js(`s += asString(${rKey}) + ':';`);
      this.valueType.codegenJsonTextEncoder(ctx, new JsExpression(() => `${r}[${rKey}]`));
    });
    ctx.js(`for (var i = 1; i < ${rLength}; i++) {`);
    ctx.js(`${rKey} = ${rKeys}[i];`);
    ctx.js(`s += ',' + asString(${rKey}) + ':';`);
    this.valueType.codegenJsonTextEncoder(ctx, new JsExpression(() => `${r}[${rKey}]`));
    ctx.js(`}`);
    ctx.writeText('}');
  }

  private codegenBinaryEncoder(ctx: BinaryEncoderCodegenContext<BinaryJsonEncoder>, value: JsExpression): void {
    const type = this.valueType;
    const codegen = ctx.codegen;
    const r = codegen.var(value.use());
    const rKeys = codegen.var(`Object.keys(${r})`);
    const rKey = codegen.var();
    const rLength = codegen.var(`${rKeys}.length`);
    const ri = codegen.var('0');
    ctx.js(`encoder.writeObjHdr(${rLength});`);
    ctx.js(`for(; ${ri} < ${rLength}; ${ri}++){`);
    ctx.js(`${rKey} = ${rKeys}[${ri}];`);
    ctx.js(`encoder.writeStr(${rKey});`);
    const expr = new JsExpression(() => `${r}[${rKey}]`);
    if (ctx instanceof CborEncoderCodegenContext) type.codegenCborEncoder(ctx, expr);
    else if (ctx instanceof MessagePackEncoderCodegenContext) type.codegenMessagePackEncoder(ctx, expr);
    else throw new Error('Unknown encoder');
    ctx.js(`}`);
  }

  public codegenCborEncoder(ctx: CborEncoderCodegenContext, value: JsExpression): void {
    this.codegenBinaryEncoder(ctx, value);
  }

  public codegenMessagePackEncoder(ctx: MessagePackEncoderCodegenContext, value: JsExpression): void {
    this.codegenBinaryEncoder(ctx, value);
  }

  public codegenJsonEncoder(ctx: JsonEncoderCodegenContext, value: JsExpression): void {
    const type = this.valueType;
    const objStartBlob = ctx.gen((encoder) => encoder.writeStartObj());
    const objEndBlob = ctx.gen((encoder) => encoder.writeEndObj());
    const separatorBlob = ctx.gen((encoder) => encoder.writeObjSeparator());
    const keySeparatorBlob = ctx.gen((encoder) => encoder.writeObjKeySeparator());
    const codegen = ctx.codegen;
    const r = codegen.var(value.use());
    const rKeys = codegen.var(`Object.keys(${r})`);
    const rKey = codegen.var();
    const rLength = codegen.var(`${rKeys}.length`);
    ctx.blob(objStartBlob);
    ctx.codegen.if(`${rLength}`, () => {
      ctx.js(`${rKey} = ${rKeys}[0];`);
      codegen.js(`encoder.writeStr(${rKey});`);
      ctx.blob(keySeparatorBlob);
      type.codegenJsonEncoder(ctx, new JsExpression(() => `${r}[${rKey}]`));
    });
    ctx.js(`for (var i = 1; i < ${rLength}; i++) {`);
    ctx.js(`${rKey} = ${rKeys}[i];`);
    ctx.blob(separatorBlob);
    codegen.js(`encoder.writeStr(${rKey});`);
    ctx.blob(keySeparatorBlob);
    type.codegenJsonEncoder(ctx, new JsExpression(() => `${r}[${rKey}]`));
    ctx.js(`}`);
    ctx.blob(objEndBlob);
  }

  public toJson(value: unknown, system: TypeSystem | undefined = this.system): json_string<unknown> {
    const map = value as Record<string, unknown>;
    const keys = Object.keys(map);
    const length = keys.length;
    if (!length) return '{}' as json_string<unknown>;
    const last = length - 1;
    const type = this.valueType;
    let str = '{';
    for (let i = 0; i < last; i++) {
      const key = keys[i];
      const val = (value as any)[key];
      if (val === undefined) continue;
      str += asString(key) + ':' + type.toJson(val as any, system) + ',';
    }
    const key = keys[last];
    const val = (value as any)[key];
    if (val !== undefined) {
      str += asString(key) + ':' + type.toJson(val as any, system);
    } else if (str.length > 1) str = str.slice(0, -1);
    return (str + '}') as json_string<unknown>;
  }

  public toString(tab: string = ''): string {
    return super.toString(tab) + printTree(tab, [(tab) => this.valueType.toString(tab)]);
  }
}
