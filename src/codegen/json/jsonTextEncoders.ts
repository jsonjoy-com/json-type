import type {JsonTextEncoderCodegenContext} from './JsonTextEncoderCodegenContext';
import {JsExpression} from '@jsonjoy.com/util/lib/codegen/util/JsExpression';
import type {Type} from '../../type';
import {asString} from '@jsonjoy.com/util/lib/strings/asString';
import {normalizeAccessor} from '@jsonjoy.com/util/lib/codegen/util/normalizeAccessor';

type JsonTextEncoderFunction = (ctx: JsonTextEncoderCodegenContext, value: JsExpression, type: Type) => void;

export const any = (ctx: JsonTextEncoderCodegenContext, value: JsExpression, type: Type): void => {
  const codegen = ctx.codegen;
  codegen.link('Value');
  const r = codegen.var(value.use());
  codegen.if(
    `${r} instanceof Value`,
    () => {
      codegen.if(
        `${r}.type`,
        () => {
          codegen.js(`s += ${r}.type.jsonTextEncoder()(${r}.data);`);
        },
        () => {
          const asStringFn = codegen.linkDependency(asString);
          codegen.js(`s += ${asStringFn}(${r}.data);`);
        },
      );
    },
    () => {
      const asStringFn = codegen.linkDependency(asString);
      codegen.js(`s += ${asStringFn}(${r});`);
    },
  );
};

export const bool = (ctx: JsonTextEncoderCodegenContext, value: JsExpression): void => {
  ctx.js(/* js */ `s += ${value.use()} ? 'true' : 'false';`);
};

export const num = (ctx: JsonTextEncoderCodegenContext, value: JsExpression): void => {
  ctx.js(/* js */ `s += '' + ${value.use()};`);
};

export const str = (ctx: JsonTextEncoderCodegenContext, value: JsExpression, type: Type): void => {
  const strType = type as any; // StrType
  if (strType.schema.noJsonEscape) {
    ctx.writeText('"');
    ctx.js(/* js */ `s += ${value.use()};`);
    ctx.writeText('"');
  } else {
    const asStringFn = ctx.codegen.linkDependency(asString);
    ctx.js(/* js */ `s += ${asStringFn}(${value.use()});`);
  }
};

export const bin = (ctx: JsonTextEncoderCodegenContext, value: JsExpression): void => {
  const asStringFn = ctx.codegen.linkDependency(asString);
  ctx.js(/* js */ `s += ${asStringFn}(${value.use()});`);
};

export const const_ = (ctx: JsonTextEncoderCodegenContext, value: JsExpression, type: Type): void => {
  const constType = type as any; // ConType
  const constValue = constType.value();
  const asStringFn = ctx.codegen.linkDependency(asString);
  ctx.js(/* js */ `s += ${asStringFn}(${JSON.stringify(constValue)});`);
};

export const arr = (
  ctx: JsonTextEncoderCodegenContext,
  value: JsExpression,
  type: Type,
  encodeFn: JsonTextEncoderFunction,
): void => {
  const arrType = type as any; // ArrType
  ctx.writeText('[');
  const codegen = ctx.codegen;
  const r = codegen.getRegister(); // array
  const rl = codegen.getRegister(); // array.length
  const rll = codegen.getRegister(); // last
  const ri = codegen.getRegister(); // index
  ctx.js(/* js */ `var ${r} = ${value.use()}, ${rl} = ${r}.length, ${rll} = ${rl} - 1, ${ri} = 0;`);
  ctx.js(/* js */ `for(; ${ri} < ${rll}; ${ri}++) ` + '{');
  encodeFn(ctx, new JsExpression(() => `${r}[${ri}]`), arrType.type);
  ctx.js(/* js */ `s += ',';`);
  ctx.js(`}`);
  ctx.js(`if (${rl}) {`);
  encodeFn(ctx, new JsExpression(() => `${r}[${rll}]`), arrType.type);
  ctx.js(`}`);
  ctx.writeText(']');
};

export const tup = (
  ctx: JsonTextEncoderCodegenContext,
  value: JsExpression,
  type: Type,
  encodeFn: JsonTextEncoderFunction,
): void => {
  const tupType = type as any; // TupType
  const codegen = ctx.codegen;
  const r = codegen.var(value.use());
  const types = tupType.types;
  ctx.writeText('[');
  for (let i = 0; i < types.length; i++) {
    if (i > 0) ctx.writeText(',');
    encodeFn(ctx, new JsExpression(() => `${r}[${i}]`), types[i]);
  }
  ctx.writeText(']');
};

export const obj = (
  ctx: JsonTextEncoderCodegenContext,
  value: JsExpression,
  type: Type,
  encodeFn: JsonTextEncoderFunction,
): void => {
  const objType = type as any; // ObjType
  const codegen = ctx.codegen;
  const r = codegen.var(value.use());
  const encodeUnknownFields = !!objType.schema.encodeUnknownFields;

  if (encodeUnknownFields) {
    const asStringFn = codegen.linkDependency(asString);
    ctx.js(/* js */ `s += ${asStringFn}(${r});`);
    return;
  }

  const fields = objType.fields;
  ctx.writeText('{');

  let hasFields = false;
  for (const field of fields) {
    const key = field.key;
    const accessor = normalizeAccessor(key);
    const isOptional = field.optional || field.constructor?.name === 'ObjectOptionalFieldType';

    const writeField = () => {
      if (hasFields) ctx.writeText(',');
      ctx.writeText(`"${key}":`);
      encodeFn(ctx, new JsExpression(() => `${r}${accessor}`), field.value);
      hasFields = true;
    };

    if (isOptional) {
      ctx.js(`if (${r}${accessor} !== undefined) {`);
      writeField();
      ctx.js(`}`);
    } else {
      writeField();
    }
  }

  ctx.writeText('}');
};

export const map = (
  ctx: JsonTextEncoderCodegenContext,
  value: JsExpression,
  type: Type,
  encodeFn: JsonTextEncoderFunction,
): void => {
  const mapType = type as any; // MapType
  const codegen = ctx.codegen;
  const r = codegen.var(value.use());
  const rKeys = codegen.var(`Object.keys(${r})`);
  const rKey = codegen.var();
  const rLen = codegen.var(`${rKeys}.length`);
  const ri = codegen.var('0');
  const rll = codegen.var(`${rLen} - 1`);

  ctx.writeText('{');
  ctx.js(`var ${rKeys}, ${rKey}, ${rLen}, ${ri}, ${rll};`);
  ctx.js(`${rKeys} = Object.keys(${r});`);
  ctx.js(`${rLen} = ${rKeys}.length;`);
  ctx.js(`${rll} = ${rLen} - 1;`);
  ctx.js(`for (; ${ri} < ${rll}; ${ri}++) {`);
  ctx.js(`${rKey} = ${rKeys}[${ri}];`);
  ctx.js(`s += '"' + ${rKey} + '":';`);
  encodeFn(ctx, new JsExpression(() => `${r}[${rKey}]`), mapType.valueType);
  ctx.js(`s += ',';`);
  ctx.js(`}`);
  ctx.js(`if (${rLen}) {`);
  ctx.js(`${rKey} = ${rKeys}[${rll}];`);
  ctx.js(`s += '"' + ${rKey} + '":';`);
  encodeFn(ctx, new JsExpression(() => `${r}[${rKey}]`), mapType.valueType);
  ctx.js(`}`);
  ctx.writeText('}');
};

export const ref = (ctx: JsonTextEncoderCodegenContext, value: JsExpression, type: Type): void => {
  const refType = type as any; // RefType
  const system = ctx.options.system || refType.system;
  if (!system) throw new Error('NO_SYSTEM');
  const encoder = system.resolve(refType.schema.ref).type.jsonTextEncoder();
  const d = ctx.codegen.linkDependency(encoder);
  ctx.js(`s += ${d}(${value.use()});`);
};

export const or = (
  ctx: JsonTextEncoderCodegenContext,
  value: JsExpression,
  type: Type,
  encodeFn: JsonTextEncoderFunction,
): void => {
  const orType = type as any; // OrType
  const codegen = ctx.codegen;
  const discriminator = orType.discriminator();
  const d = codegen.linkDependency(discriminator);
  const types = orType.types;
  codegen.switch(
    `${d}(${value.use()})`,
    types.map((childType: Type, index: number) => [
      index,
      () => {
        encodeFn(ctx, value, childType);
      },
    ]),
  );
};

/**
 * Main router function that dispatches JSON text encoding to the appropriate
 * encoder function based on the type's kind.
 */
export const generate = (ctx: JsonTextEncoderCodegenContext, value: JsExpression, type: Type): void => {
  const kind = type.kind();

  switch (kind) {
    case 'any':
      any(ctx, value, type);
      break;
    case 'bool':
      bool(ctx, value);
      break;
    case 'num':
      num(ctx, value);
      break;
    case 'str':
      str(ctx, value, type);
      break;
    case 'bin':
      bin(ctx, value);
      break;
    case 'con':
      const_(ctx, value, type);
      break;
    case 'arr':
      arr(ctx, value, type, generate);
      break;
    case 'tup':
      tup(ctx, value, type, generate);
      break;
    case 'obj':
      obj(ctx, value, type, generate);
      break;
    case 'map':
      map(ctx, value, type, generate);
      break;
    case 'ref':
      ref(ctx, value, type);
      break;
    case 'or':
      or(ctx, value, type, generate);
      break;
    default:
      throw new Error(`${kind} type JSON text encoding not implemented`);
  }
};
