import type {CborEncoderCodegenContext} from './CborEncoderCodegenContext';
import {JsExpression} from '@jsonjoy.com/codegen/lib/util/JsExpression';
import type {Type} from '../../type';
import type {BinaryJsonEncoder} from '@jsonjoy.com/json-pack/lib/types';
import type {BinaryEncoderCodegenContext} from './BinaryEncoderCodegenContext';
import {normalizeAccessor} from '@jsonjoy.com/codegen/lib/util/normalizeAccessor';
import {EncodingFormat} from '@jsonjoy.com/json-pack/lib/constants';

type CborEncoderFunction = (ctx: CborEncoderCodegenContext, value: JsExpression, type: Type) => void;

const codegenBinaryEncoder = (
  ctx: BinaryEncoderCodegenContext<BinaryJsonEncoder>,
  value: JsExpression,
  type: Type,
): void => {
  const kind = type.kind();
  const v = value.use();

  switch (kind) {
    case 'str': {
      const strType = type as any; // StrType
      const {ascii, format} = strType.schema;
      // Use ASCII encoding if format is 'ascii' or ascii=true (backward compatibility)
      const useAscii = format === 'ascii' || ascii;
      if (useAscii) ctx.js(/* js */ `encoder.writeAsciiStr(${v});`);
      else ctx.js(/* js */ `encoder.writeStr(${v});`);
      break;
    }
    case 'bin': {
      ctx.js(/* js */ `encoder.writeBin(${v});`);
      break;
    }
    case 'num': {
      const numType = type as any; // NumType
      const {format, int} = numType.schema;
      if (format === 'u8') ctx.js(/* js */ `encoder.writeU8(${v});`);
      else if (format === 'u16') ctx.js(/* js */ `encoder.writeU16(${v});`);
      else if (format === 'u32') ctx.js(/* js */ `encoder.writeU32(${v});`);
      else if (format === 'i8') ctx.js(/* js */ `encoder.writeI8(${v});`);
      else if (format === 'i16') ctx.js(/* js */ `encoder.writeI16(${v});`);
      else if (format === 'i32') ctx.js(/* js */ `encoder.writeI32(${v});`);
      else if (format === 'f32') ctx.js(/* js */ `encoder.writeF32(${v});`);
      else if (format === 'f64') ctx.js(/* js */ `encoder.writeF64(${v});`);
      else if (int) ctx.js(/* js */ `encoder.writeUInt(${v});`);
      else ctx.js(/* js */ `encoder.writeF64(${v});`);
      break;
    }
    case 'bool': {
      ctx.js(/* js */ `encoder.writeBoolean(${v});`);
      break;
    }
    default: {
      ctx.js(/* js */ `encoder.writeAny(${v});`);
      break;
    }
  }
};

export const any = (ctx: CborEncoderCodegenContext, value: JsExpression, type: Type): void => {
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

export const bool = (ctx: CborEncoderCodegenContext, value: JsExpression): void => {
  codegenBinaryEncoder(ctx, value, {kind: () => 'bool'} as Type);
};

export const num = (ctx: CborEncoderCodegenContext, value: JsExpression, type: Type): void => {
  codegenBinaryEncoder(ctx, value, type);
};

export const str = (ctx: CborEncoderCodegenContext, value: JsExpression, type: Type): void => {
  codegenBinaryEncoder(ctx, value, type);
};

export const bin = (ctx: CborEncoderCodegenContext, value: JsExpression, type: Type): void => {
  codegenBinaryEncoder(ctx, value, type);
};

export const const_ = (ctx: CborEncoderCodegenContext, value: JsExpression, type: Type): void => {
  const constType = type as any; // ConType
  const constValue = constType.value();
  ctx.js(/* js */ `encoder.writeAny(${JSON.stringify(constValue)});`);
};

export const arr = (
  ctx: CborEncoderCodegenContext,
  value: JsExpression,
  type: Type,
  encodeFn: CborEncoderFunction,
): void => {
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

export const tup = (
  ctx: CborEncoderCodegenContext,
  value: JsExpression,
  type: Type,
  encodeFn: CborEncoderFunction,
): void => {
  const tupType = type as any; // TupType
  const codegen = ctx.codegen;
  const r = codegen.var(value.use());
  const types = tupType.types;
  ctx.js(/* js */ `encoder.writeArrHdr(${types.length});`);
  for (let i = 0; i < types.length; i++) {
    encodeFn(ctx, new JsExpression(() => `${r}[${i}]`), types[i]);
  }
};

export const obj = (
  ctx: CborEncoderCodegenContext,
  value: JsExpression,
  type: Type,
  encodeFn: CborEncoderFunction,
): void => {
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

export const map = (
  ctx: CborEncoderCodegenContext,
  value: JsExpression,
  type: Type,
  encodeFn: CborEncoderFunction,
): void => {
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

export const ref = (ctx: CborEncoderCodegenContext, value: JsExpression, type: Type): void => {
  const refType = type as any; // RefType
  const system = ctx.options.system || refType.system;
  if (!system) throw new Error('NO_SYSTEM');
  const format = EncodingFormat.Cbor;
  const encoder = system.resolve(refType.schema.ref).type.encoder(format);
  const d = ctx.codegen.linkDependency(encoder);
  ctx.js(`${d}(${value.use()}, encoder);`);
};

export const or = (
  ctx: CborEncoderCodegenContext,
  value: JsExpression,
  type: Type,
  encodeFn: CborEncoderFunction,
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
 * Main router function that dispatches CBOR encoding to the appropriate
 * encoder function based on the type's kind.
 */
export const generate = (ctx: CborEncoderCodegenContext, value: JsExpression, type: Type): void => {
  const kind = type.kind();

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
      throw new Error(`${kind} type CBOR encoding not implemented`);
  }
};
