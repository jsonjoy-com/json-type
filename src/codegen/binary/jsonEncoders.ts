import type {JsonEncoderCodegenContext} from './JsonEncoderCodegenContext';
import type {JsExpression} from '@jsonjoy.com/util/lib/codegen/util/JsExpression';
import type {Type} from '../../type';
import {normalizeAccessor} from '@jsonjoy.com/util/lib/codegen/util/normalizeAccessor';
import {EncodingFormat} from '@jsonjoy.com/json-pack/lib/constants';
import {floats, ints, uints} from '../../util';

type JsonEncoderFunction = (ctx: JsonEncoderCodegenContext, value: JsExpression, type: Type) => void;

const any = (ctx: JsonEncoderCodegenContext, value: JsExpression, type: Type): void => {
  const codegen = ctx.codegen;
  codegen.link('Value');
  const r = codegen.var(value.use());
  codegen.if(
    `${r} instanceof Value`,
    () => {
      codegen.if(
        `${r}.type`,
        () => {
          codegen.js(`${r}.type.encoder(encoder.format)(${r}.data, encoder);`);
        },
        () => {
          codegen.js(`encoder.writeAny(${r}.data);`);
        },
      );
    },
    () => {
      codegen.js(`encoder.writeAny(${r});`);
    },
  );
};

const bool = (ctx: JsonEncoderCodegenContext, value: JsExpression): void => {
  const v = value.use();
  ctx.js(/* js */ `encoder.writeBoolean(${v});`);
};

const num = (ctx: JsonEncoderCodegenContext, value: JsExpression, type: Type): void => {
  const numType = type as any; // NumType
  const {format} = numType.schema;
  const v = value.use();
  if (uints.has(format)) ctx.js(/* js */ `encoder.writeUInteger(${v});`);
  else if (ints.has(format)) ctx.js(/* js */ `encoder.writeInteger(${v});`);
  else if (floats.has(format)) ctx.js(/* js */ `encoder.writeFloat(${v});`);
  else ctx.js(/* js */ `encoder.writeNumber(${v});`);
};

const str = (ctx: JsonEncoderCodegenContext, value: JsExpression, type: Type): void => {
  const strType = type as any; // StrType
  const {ascii, format} = strType.schema;
  const v = value.use();
  // Use ASCII encoding if format is 'ascii' or ascii=true (backward compatibility)
  const useAscii = format === 'ascii' || ascii;
  if (useAscii) ctx.js(/* js */ `encoder.writeAsciiStr(${v});`);
  else ctx.js(/* js */ `encoder.writeStr(${v});`);
};

const bin = (ctx: JsonEncoderCodegenContext, value: JsExpression, type: Type): void => {
  const v = value.use();
  ctx.js(/* js */ `encoder.writeBin(${v});`);
};

const const_ = (ctx: JsonEncoderCodegenContext, value: JsExpression, type: Type): void => {
  const constType = type as any; // ConType
  const constValue = constType.value();
  ctx.js(/* js */ `encoder.writeAny(${JSON.stringify(constValue)});`);
};

const arr = (ctx: JsonEncoderCodegenContext, value: JsExpression, type: Type, encodeFn: JsonEncoderFunction): void => {
  const arrType = type as any; // ArrType
  const codegen = ctx.codegen;
  const r = codegen.getRegister(); // array
  const rl = codegen.getRegister(); // array.length
  const ri = codegen.getRegister(); // index
  ctx.js(/* js */ `var ${r} = ${value.use()}, ${rl} = ${r}.length, ${ri} = 0;`);
  ctx.js(/* js */ `encoder.writeArrHdr(${rl});`);
  ctx.js(/* js */ `for(; ${ri} < ${rl}; ${ri}++) ` + '{');
  encodeFn(ctx, new JsExpression(() => `${r}[${ri}]`), arrType.type);
  ctx.js(`}`);
};

const tup = (ctx: JsonEncoderCodegenContext, value: JsExpression, type: Type, encodeFn: JsonEncoderFunction): void => {
  const tupType = type as any; // TupType
  const codegen = ctx.codegen;
  const r = codegen.var(value.use());
  const types = tupType.types;
  ctx.js(/* js */ `encoder.writeArrHdr(${types.length});`);
  for (let i = 0; i < types.length; i++) {
    encodeFn(ctx, new JsExpression(() => `${r}[${i}]`), types[i]);
  }
};

const obj = (ctx: JsonEncoderCodegenContext, value: JsExpression, type: Type, encodeFn: JsonEncoderFunction): void => {
  const objType = type as any; // ObjType
  const codegen = ctx.codegen;
  const r = codegen.var(value.use());
  const encodeUnknownFields = !!objType.schema.encodeUnknownFields;

  if (encodeUnknownFields) {
    ctx.js(/* js */ `encoder.writeAny(${r});`);
    return;
  }

  const fields = objType.fields;
  const requiredFields = fields.filter((f: any) => !f.optional && f.constructor?.name !== 'ObjectOptionalFieldType');
  const optionalFields = fields.filter((f: any) => f.optional || f.constructor?.name === 'ObjectOptionalFieldType');

  if (optionalFields.length === 0) {
    // All fields are required
    ctx.js(/* js */ `encoder.writeObjHdr(${fields.length});`);
    for (const field of fields) {
      const key = field.key;
      const accessor = normalizeAccessor(key);
      ctx.js(/* js */ `encoder.writeStr(${JSON.stringify(key)});`);
      encodeFn(ctx, new JsExpression(() => `${r}${accessor}`), field.value);
    }
  } else {
    // Mixed fields - need to count optional ones dynamically
    const rSize = codegen.getRegister();
    ctx.js(/* js */ `var ${rSize} = ${requiredFields.length};`);

    // Count optional fields that exist
    for (const field of optionalFields) {
      const key = field.key;
      const accessor = normalizeAccessor(key);
      ctx.js(/* js */ `if (${r}${accessor} !== undefined) ${rSize}++;`);
    }

    ctx.js(/* js */ `encoder.writeObjHdr(${rSize});`);

    // Encode required fields
    for (const field of requiredFields) {
      const key = field.key;
      const accessor = normalizeAccessor(key);
      ctx.js(/* js */ `encoder.writeStr(${JSON.stringify(key)});`);
      encodeFn(ctx, new JsExpression(() => `${r}${accessor}`), field.value);
    }

    // Encode optional fields
    for (const field of optionalFields) {
      const key = field.key;
      const accessor = normalizeAccessor(key);
      ctx.js(/* js */ `if (${r}${accessor} !== undefined) {`);
      ctx.js(/* js */ `encoder.writeStr(${JSON.stringify(key)});`);
      encodeFn(ctx, new JsExpression(() => `${r}${accessor}`), field.value);
      ctx.js(/* js */ `}`);
    }
  }
};

const map = (ctx: JsonEncoderCodegenContext, value: JsExpression, type: Type, encodeFn: JsonEncoderFunction): void => {
  const mapType = type as any; // MapType
  const codegen = ctx.codegen;
  const r = codegen.var(value.use());
  const rKeys = codegen.var(`Object.keys(${r})`);
  const rKey = codegen.var();
  const rLen = codegen.var(`${rKeys}.length`);
  const ri = codegen.var('0');

  ctx.js(/* js */ `var ${rKeys} = Object.keys(${r}), ${rLen} = ${rKeys}.length, ${rKey}, ${ri} = 0;`);
  ctx.js(/* js */ `encoder.writeObjHdr(${rLen});`);
  ctx.js(/* js */ `for (; ${ri} < ${rLen}; ${ri}++) {`);
  ctx.js(/* js */ `${rKey} = ${rKeys}[${ri}];`);
  ctx.js(/* js */ `encoder.writeStr(${rKey});`);
  encodeFn(ctx, new JsExpression(() => `${r}[${rKey}]`), mapType.valueType);
  ctx.js(`}`);
};

const ref = (ctx: JsonEncoderCodegenContext, value: JsExpression, type: Type): void => {
  const refType = type as any; // RefType
  const system = ctx.options.system || refType.system;
  if (!system) throw new Error('NO_SYSTEM');
  const encoder = system.resolve(refType.schema.ref).type.encoder(ctx.encoder.format);
  const d = ctx.codegen.linkDependency(encoder);
  ctx.js(`${d}(${value.use()}, encoder);`);
};

const or = (ctx: JsonEncoderCodegenContext, value: JsExpression, type: Type, encodeFn: JsonEncoderFunction): void => {
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
 * Main router function that dispatches JSON encoding to the appropriate
 * encoder function based on the type's kind.
 */
export const generate = (ctx: JsonEncoderCodegenContext, value: JsExpression, type: Type): void => {
  const kind = type.getTypeName();

  switch (kind) {
    case 'any':
      any(ctx, value, type);
      break;
    case 'bool':
      bool(ctx, value);
      break;
    case 'num':
      num(ctx, value, type);
      break;
    case 'str':
      str(ctx, value, type);
      break;
    case 'bin':
      bin(ctx, value, type);
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
      throw new Error(`${kind} type JSON encoding not implemented`);
  }
};
