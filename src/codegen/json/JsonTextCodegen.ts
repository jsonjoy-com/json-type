import {Codegen, CodegenStepExecJs} from '@jsonjoy.com/util/lib/codegen';
import {asString} from '@jsonjoy.com/util/lib/strings/asString';
import {toBase64} from '@jsonjoy.com/base64/lib/toBase64';
import {JsExpression} from '@jsonjoy.com/util/lib/codegen/util/JsExpression';
import {stringify} from '@jsonjoy.com/json-pack/lib/json-binary/codec';
import {normalizeAccessor} from '@jsonjoy.com/util/lib/codegen/util/normalizeAccessor';
import type {TypeSystem} from '../../system';
import type {ConType, StrType, Type} from '../../type';
import type {json_string} from '@jsonjoy.com/util/lib/json-brand';

// type JsonTextEncoderFunction = (ctx: JsonTextCodegen, value: JsExpression, type: Type) => void;

export type JsonEncoderFn = <T>(value: T) => json_string<T>;

const CACHE = new WeakMap<Type, JsonEncoderFn>;

class WriteTextStep {
  constructor(public str: string) {}
}

type Step = WriteTextStep | CodegenStepExecJs;

export class JsonTextCodegen {
  public static readonly get = (type: Type, name?: string) => {
    const fn = CACHE.get(type);
    if (fn) return fn;
    const codegen = new JsonTextCodegen(type, name);
    const r = codegen.codegen.options.args[0];
    const expression = new JsExpression(() => r);
    codegen.generate(expression, type);
    const newFn = codegen.compile();
    CACHE.set(type, newFn);
    return newFn;
  };

  public readonly codegen: Codegen<JsonEncoderFn>;

  constructor(protected readonly type: Type, name?: string) {
    this.codegen = new Codegen<JsonEncoderFn>({
      name: 'toJson' + (name ? '_' + name : ''),
      prologue: `var s = '';`,
      epilogue: `return s;`,
      linkable: {
        toBase64,
      },
      processSteps: (steps) => {
        const stepsJoined: Step[] = [];
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          if (step instanceof CodegenStepExecJs) stepsJoined.push(step);
          else if (step instanceof WriteTextStep) {
            const last = stepsJoined[stepsJoined.length - 1];
            if (last instanceof WriteTextStep) last.str += step.str;
            else stepsJoined.push(step);
          }
        }
        const execSteps: CodegenStepExecJs[] = [];
        for (const step of stepsJoined) {
          if (step instanceof CodegenStepExecJs) {
            execSteps.push(step);
          } else if (step instanceof WriteTextStep) {
            const js = /* js */ `s += ${JSON.stringify(step.str)};`;
            execSteps.push(new CodegenStepExecJs(js));
          }
        }
        return execSteps;
      },
    });
    this.codegen.linkDependency(asString, 'asString');
    this.codegen.linkDependency(stringify, 'stringify');
  }

  public js(js: string): void {
    this.codegen.js(js);
  }

  public writeText(str: string): void {
    this.codegen.step(new WriteTextStep(str));
  }

  public compile() {
    return this.codegen.compile();
  }

// export const arr = (
//   ctx: JsonTextCodegen,
//   value: JsExpression,
//   type: Type,
//   encodeFn: JsonTextEncoderFunction,
// ): void => {
//   const arrType = type as any; // ArrType
//   ctx.writeText('[');
//   const codegen = ctx.codegen;
//   const r = codegen.getRegister(); // array
//   const rl = codegen.getRegister(); // array.length
//   const rll = codegen.getRegister(); // last
//   const ri = codegen.getRegister(); // index
//   ctx.js(/* js */ `var ${r} = ${value.use()}, ${rl} = ${r}.length, ${rll} = ${rl} - 1, ${ri} = 0;`);
//   ctx.js(/* js */ `for(; ${ri} < ${rll}; ${ri}++) ` + '{');
//   encodeFn(ctx, new JsExpression(() => `${r}[${ri}]`), arrType.type);
//   ctx.js(/* js */ `s += ',';`);
//   ctx.js(`}`);
//   ctx.js(`if (${rl}) {`);
//   encodeFn(ctx, new JsExpression(() => `${r}[${rll}]`), arrType.type);
//   ctx.js(`}`);
//   ctx.writeText(']');
// };

// export const tup = (
//   ctx: JsonTextCodegen,
//   value: JsExpression,
//   type: Type,
//   encodeFn: JsonTextEncoderFunction,
// ): void => {
//   const tupType = type as any; // TupType
//   const codegen = ctx.codegen;
//   const r = codegen.var(value.use());
//   const types = tupType.types;
//   ctx.writeText('[');
//   for (let i = 0; i < types.length; i++) {
//     if (i > 0) ctx.writeText(',');
//     encodeFn(ctx, new JsExpression(() => `${r}[${i}]`), types[i]);
//   }
//   ctx.writeText(']');
// };

// export const obj = (
//   ctx: JsonTextCodegen,
//   value: JsExpression,
//   type: Type,
//   encodeFn: JsonTextEncoderFunction,
// ): void => {
//   const objType = type as any; // ObjType
//   const codegen = ctx.codegen;
//   const r = codegen.var(value.use());
//   const encodeUnknownFields = !!objType.schema.encodeUnknownFields;

//   if (encodeUnknownFields) {
//     const asStringFn = codegen.linkDependency(asString);
//     ctx.js(/* js */ `s += ${asStringFn}(${r});`);
//     return;
//   }

//   const fields = objType.fields;
//   ctx.writeText('{');

//   let hasFields = false;
//   for (const field of fields) {
//     const key = field.key;
//     const accessor = normalizeAccessor(key);
//     const isOptional = field.optional || field.constructor?.name === 'ObjectOptionalFieldType';

//     const writeField = () => {
//       if (hasFields) ctx.writeText(',');
//       ctx.writeText(`"${key}":`);
//       encodeFn(ctx, new JsExpression(() => `${r}${accessor}`), field.value);
//       hasFields = true;
//     };

//     if (isOptional) {
//       ctx.js(`if (${r}${accessor} !== undefined) {`);
//       writeField();
//       ctx.js(`}`);
//     } else {
//       writeField();
//     }
//   }

//   ctx.writeText('}');
// };

// export const map = (
//   ctx: JsonTextCodegen,
//   value: JsExpression,
//   type: Type,
//   encodeFn: JsonTextEncoderFunction,
// ): void => {
//   const mapType = type as any; // MapType
//   const codegen = ctx.codegen;
//   const r = codegen.var(value.use());
//   const rKeys = codegen.var(`Object.keys(${r})`);
//   const rKey = codegen.var();
//   const rLen = codegen.var(`${rKeys}.length`);
//   const ri = codegen.var('0');
//   const rll = codegen.var(`${rLen} - 1`);

//   ctx.writeText('{');
//   ctx.js(`var ${rKeys}, ${rKey}, ${rLen}, ${ri}, ${rll};`);
//   ctx.js(`${rKeys} = Object.keys(${r});`);
//   ctx.js(`${rLen} = ${rKeys}.length;`);
//   ctx.js(`${rll} = ${rLen} - 1;`);
//   ctx.js(`for (; ${ri} < ${rll}; ${ri}++) {`);
//   ctx.js(`${rKey} = ${rKeys}[${ri}];`);
//   ctx.js(`s += '"' + ${rKey} + '":';`);
//   encodeFn(ctx, new JsExpression(() => `${r}[${rKey}]`), mapType.valueType);
//   ctx.js(`s += ',';`);
//   ctx.js(`}`);
//   ctx.js(`if (${rLen}) {`);
//   ctx.js(`${rKey} = ${rKeys}[${rll}];`);
//   ctx.js(`s += '"' + ${rKey} + '":';`);
//   encodeFn(ctx, new JsExpression(() => `${r}[${rKey}]`), mapType.valueType);
//   ctx.js(`}`);
//   ctx.writeText('}');
// };

// export const ref = (ctx: JsonTextCodegen, value: JsExpression, type: Type): void => {
//   const refType = type as any; // RefType
//   const system = ctx.options.system || refType.system;
//   if (!system) throw new Error('NO_SYSTEM');
//   const encoder = system.resolve(refType.schema.ref).type.jsonTextEncoder();
//   const d = ctx.codegen.linkDependency(encoder);
//   ctx.js(`s += ${d}(${value.use()});`);
// };

// export const or = (
//   ctx: JsonTextCodegen,
//   value: JsExpression,
//   type: Type,
//   encodeFn: JsonTextEncoderFunction,
// ): void => {
//   const orType = type as any; // OrType
//   const codegen = ctx.codegen;
//   const discriminator = orType.discriminator();
//   const d = codegen.linkDependency(discriminator);
//   const types = orType.types;
//   codegen.switch(
//     `${d}(${value.use()})`,
//     types.map((childType: Type, index: number) => [
//       index,
//       () => {
//         encodeFn(ctx, value, childType);
//       },
//     ]),
//   );
// };

  public generate(value: JsExpression, type: Type): void {
    const kind = type.kind();
    const codegen = this.codegen;
    switch (kind) {
      case 'any': {
        const r = codegen.var(value.use());
        codegen.js(`s += stringify(${r});`);
        break;
      }
      case 'bool': {
        this.js(/* js */ `s += ${value.use()} ? 'true' : 'false';`);
        break;
      }
      case 'num': {
        this.js(/* js */ `s += '' + ${value.use()};`);
        break;
      }
      case 'str': {
        const strType = type as StrType;
        if (strType.getSchema().noJsonEscape) {
          this.writeText('"');
          this.js(/* js */ `s += ${value.use()};`);
          this.writeText('"');
        } else {
          this.js(/* js */ `s += asString(${value.use()});`);
        }
        break;
      }
      case 'bin': {
        this.codegen.link('toBase64');
        this.writeText('"data:application/octet-stream;base64,');
        this.js(/* js */ `s += toBase64(${value.use()});`);
        this.writeText('"');
        break;
      }
      case 'con': {
        const constType = type as ConType;
        this.js(/* js */ `s += ${JSON.stringify(stringify(constType.literal()))}`);
        break;
      }
      // case 'arr':
      //   arr(ctx, value, type, generate);
      //   break;
      // case 'tup':
      //   tup(ctx, value, type, generate);
      //   break;
      // case 'obj':
      //   obj(ctx, value, type, generate);
      //   break;
      // case 'map':
      //   map(ctx, value, type, generate);
      //   break;
      // case 'ref':
      //   ref(ctx, value, type);
      //   break;
      // case 'or':
      //   or(ctx, value, type, generate);
      //   break;
      default:
        throw new Error(`${kind} type JSON text encoding not implemented`);
    }
  }
}
