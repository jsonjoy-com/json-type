import * as schema from '../../schema';
import {AbsType} from './AbsType';
import {printTree} from 'tree-dump';
import type {SchemaOf, Type} from '../types';
import type {TypeExportContext} from '../../system/TypeExportContext';

export class ArrType<T extends Type | void, const Head extends Type[], const Tail extends Type[]>
  extends AbsType<schema.ArrSchema<
    T extends void ? schema.Schema : SchemaOf<T extends Type ? T : never>,
    {[K in keyof Head]: SchemaOf<Head[K]>},
    {[K in keyof Tail]: SchemaOf<Tail[K]>}
  >> {
  constructor(
    public readonly _type?: T,
    public readonly _head?: Head,
    public readonly _tail?: Tail,
    options?: schema.Optional<schema.ArrSchema>,
  ) {
    super(schema.s.Array(schema.s.any, options) as schema.ArrSchema<any, any, any>);
  }

  public head<const H extends Type[]>(...head: H): ArrType<T, H, Tail> {
    (this as any)._head = head as any;
    return this as any;
  }

  public tail<const X extends Type[]>(...tail: X): ArrType<T, Head, X> {
    (this as any)._tail = tail as any;
    return this as any;
  }

  public min(min: schema.ArrSchema['min']): this {
    this.schema.min = min;
    return this;
  }

  public max(max: schema.ArrSchema['max']): this {
    this.schema.max = max;
    return this;
  }

  public getSchema(ctx?: TypeExportContext) {
    const schema: schema.ArrSchema<
      T extends void ? schema.Schema : SchemaOf<T extends Type ? T : never>,
      {[K in keyof Head]: SchemaOf<Head[K]>},
      {[K in keyof Tail]: SchemaOf<Tail[K]>}
    > = {
      ...this.schema,
    };
    const {_type, _head, _tail} = this;
    if (_type) schema.type = _type.getSchema(ctx) as any;
    if (_head) schema.head = _head.map((t) => t.getSchema(ctx)) as any;
    if (_tail) schema.tail = _tail.map((t) => t.getSchema(ctx)) as any;
    return schema;
  }

  public getOptions(): schema.Optional<schema.ArrSchema<T extends void ? schema.Schema : SchemaOf<T extends Type ? T : never>>> {
    const {kind, type, ...options} = this.schema;
    return options as any;
  }

  // public codegenValidator(ctx: ValidatorCodegenContext, path: ValidationPath, r: string): void {
  //   const rl = ctx.codegen.getRegister();
  //   const ri = ctx.codegen.getRegister();
  //   const rv = ctx.codegen.getRegister();
  //   const err = ctx.err(ValidationError.ARR, path);
  //   const errLen = ctx.err(ValidationError.ARR_LEN, path);
  //   const {min, max} = this.schema;
  //   const _type = this._type;
  //   ctx.js(/* js */ `if (!Array.isArray(${r})) return ${err};`);
  //   ctx.js(/* js */ `var ${rl} = ${r}.length;`);
  //   if (_type) {
  //     if (min !== undefined) ctx.js(/* js */ `if (${rl} < ${min}) return ${errLen};`);
  //     if (max !== undefined) ctx.js(/* js */ `if (${rl} > ${max}) return ${errLen};`);
  //     ctx.js(/* js */ `for (var ${rv}, ${ri} = ${r}.length; ${ri}-- !== 0;) {`);
  //     ctx.js(/* js */ `${rv} = ${r}[${ri}];`);
  //     _type.codegenValidator(ctx, [...path, {r: ri}], rv);
  //     ctx.js(/* js */ `}`);
  //     ctx.emitCustomValidators(this, path, r);
  //   }
  // }

  // public codegenJsonTextEncoder(ctx: JsonTextEncoderCodegenContext, value: JsExpression): void {
  //   ctx.writeText('[');
  //   const codegen = ctx.codegen;
  //   const r = codegen.getRegister(); // array
  //   const rl = codegen.getRegister(); // array.length
  //   const rll = codegen.getRegister(); // last
  //   const ri = codegen.getRegister(); // index
  //   const _type = this._type;
  //   if (_type) {
  //     ctx.js(/* js */ `var ${r} = ${value.use()}, ${rl} = ${r}.length, ${rll} = ${rl} - 1, ${ri} = 0;`);
  //     ctx.js(/* js */ `for(; ${ri} < ${rll}; ${ri}++) ` + '{');
  //     _type.codegenJsonTextEncoder(ctx, new JsExpression(() => `${r}[${ri}]`));
  //     ctx.js(/* js */ `s += ',';`);
  //     ctx.js(/* js */ `}`);
  //     ctx.js(/* js */ `if (${rl}) {`);
  //     _type.codegenJsonTextEncoder(ctx, new JsExpression(() => `${r}[${rll}]`));
  //     ctx.js(/* js */ `}`);
  //     ctx.writeText(/* js */ `]`);
  //   }
  // }

  // private codegenBinaryEncoder(ctx: BinaryEncoderCodegenContext<BinaryJsonEncoder>, value: JsExpression): void {
  //   const _type = this._type;
  //   const codegen = ctx.codegen;
  //   const r = codegen.getRegister(); // array
  //   const rl = codegen.getRegister(); // array.length
  //   const ri = codegen.getRegister(); // index
  //   const rItem = codegen.getRegister(); // item
  //   const expr = new JsExpression(() => `${rItem}`);
  //   ctx.js(/* js */ `var ${r} = ${value.use()}, ${rl} = ${r}.length, ${ri} = 0, ${rItem};`);
  //   ctx.js(/* js */ `encoder.writeArrHdr(${rl});`);
  //   ctx.js(/* js */ `for(; ${ri} < ${rl}; ${ri}++) ` + '{');
  //   ctx.js(/* js */ `${rItem} = ${r}[${ri}];`);
  //   if (_type) {
  //     if (ctx instanceof CborEncoderCodegenContext) _type.codegenCborEncoder(ctx, expr);
  //     else if (ctx instanceof MessagePackEncoderCodegenContext) _type.codegenMessagePackEncoder(ctx, expr);
  //     else throw new Error('Unknown encoder');
  //   }
  //   ctx.js(/* js */ `}`);
  // }

  // public codegenCborEncoder(ctx: CborEncoderCodegenContext, value: JsExpression): void {
  //   this.codegenBinaryEncoder(ctx, value);
  // }

  // public codegenMessagePackEncoder(ctx: MessagePackEncoderCodegenContext, value: JsExpression): void {
  //   this.codegenBinaryEncoder(ctx, value);
  // }

  // public codegenJsonEncoder(ctx: JsonEncoderCodegenContext, value: JsExpression): void {
  //   const _type = this._type;
  //   const codegen = ctx.codegen;
  //   const expr = new JsExpression(() => /* js */ `${rItem}`);
  //   const r = codegen.var(value.use());
  //   const rLen = codegen.var(/* js */ `${r}.length`);
  //   const rLast = codegen.var(/* js */ `${rLen} - 1`);
  //   const ri = codegen.var(/* js */ '0');
  //   const rItem = codegen.var();
  //   ctx.blob(
  //     ctx.gen((encoder) => {
  //       encoder.writeStartArr();
  //     }),
  //   );
  //   codegen.js(/* js */ `for(; ${ri} < ${rLast}; ${ri}++) {`);
  //   codegen.js(/* js */ `${rItem} = ${r}[${ri}];`);
  //   if (_type) {
  //     _type.codegenJsonEncoder(ctx, expr);
  //     ctx.blob(
  //       ctx.gen((encoder) => {
  //         encoder.writeArrSeparator();
  //       }),
  //     );
  //     ctx.js(/* js */ `}`);
  //     ctx.js(/* js */ `if (${rLen}) {`);
  //     codegen.js(/* js */ `${rItem} = ${r}[${rLast}];`);
  //     _type.codegenJsonEncoder(ctx, expr);
  //     ctx.js(/* js */ `}`);
  //     ctx.blob(
  //       ctx.gen((encoder) => {
  //         encoder.writeEndArr();
  //       }),
  //     );
  //   }
  // }

  // public toJson(value: unknown, system: TypeSystem | undefined = this.system): json_string<unknown> {
  //   const length = (value as unknown[]).length;
  //   if (!length) return '[]' as json_string<unknown>;
  //   const last = length - 1;
  //   const type = this._type;
  //   let str = '[';
  //   for (let i = 0; i < last; i++) str += (type as any).toJson((value as unknown[])[i] as any, system) + ',';
  //   str += (type as any).toJson((value as unknown[])[last] as any, system);
  //   return (str + ']') as json_string<unknown>;
  // }

  public toString(tab: string = ''): string {
    return super.toString(tab) + printTree(tab, [
      (tab) => this._type ? this._type.toString(tab) : '...',
    ]);
  }
}
