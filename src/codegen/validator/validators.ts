import type {ValidatorCodegenContext} from './ValidatorCodegenContext';
import type {ValidationPath} from './types';
import type {Type} from '../../type';
import {ValidationError} from '../../constants';
import {isAscii, isUtf8} from '../../util/stringFormats';
import {canSkipObjectKeyUndefinedCheck} from './util';
import {normalizeAccessor} from '@jsonjoy.com/util/lib/codegen/util/normalizeAccessor';

type ValidatorFunction = (ctx: ValidatorCodegenContext, path: ValidationPath, r: string, type: Type) => void;

export const any = (ctx: ValidatorCodegenContext, path: ValidationPath, r: string, type: Type): void => {
  const codegen = ctx.codegen;
  codegen.link('Value');
  const rv = codegen.getRegister();
  const rt = codegen.getRegister();
  ctx.js(/* js */ `var ${rv} = ${r}, ${rt} = ${rv} instanceof Value ? ${rv}.type : null;`);
  ctx.js(/* js */ `if (${rt}) {`);
  ctx.js(/* js */ `var res = ${rt}.validator(${JSON.stringify(ctx.options.errors)})(${rv}.data);`);
  ctx.js(/* js */ `if (res) return res;`);
  ctx.js(/* js */ `}`);
  ctx.emitCustomValidators(type, path, r);
};

export const bool = (ctx: ValidatorCodegenContext, path: ValidationPath, r: string, type: Type): void => {
  const error = ctx.err(ValidationError.BOOL, path);
  ctx.js(/* js */ `if(typeof ${r} !== "boolean") return ${error};`);
  ctx.emitCustomValidators(type, path, r);
};

export const num = (ctx: ValidatorCodegenContext, path: ValidationPath, r: string, type: Type): void => {
  const numType = type as any; // NumType
  const {format, gte, gt, lte, lt, int} = numType.schema;
  const error = ctx.err(ValidationError.NUM, path);
  ctx.js(/* js */ `if(typeof ${r} !== "number") return ${error};`);

  if (int || format) {
    const intErr = ctx.err(ValidationError.INT, path);
    ctx.js(/* js */ `if(${r} !== (${r} | 0)) return ${intErr};`);
  }

  if (typeof gte === 'number') {
    const err = ctx.err(ValidationError.GTE, path);
    ctx.js(/* js */ `if(${r} < ${gte}) return ${err};`);
  }
  if (typeof gt === 'number') {
    const err = ctx.err(ValidationError.GT, path);
    ctx.js(/* js */ `if(${r} <= ${gt}) return ${err};`);
  }
  if (typeof lte === 'number') {
    const err = ctx.err(ValidationError.LTE, path);
    ctx.js(/* js */ `if(${r} > ${lte}) return ${err};`);
  }
  if (typeof lt === 'number') {
    const err = ctx.err(ValidationError.LT, path);
    ctx.js(/* js */ `if(${r} >= ${lt}) return ${err};`);
  }

  const customFormatValidation = () => {
    if (format === 'u8') {
      const err = ctx.err(ValidationError.UINT, path);
      ctx.js(/* js */ `if(${r} < 0 || ${r} > 255) return ${err};`);
    } else if (format === 'u16') {
      const err = ctx.err(ValidationError.UINT, path);
      ctx.js(/* js */ `if(${r} < 0 || ${r} > 65535) return ${err};`);
    } else if (format === 'u32') {
      const err = ctx.err(ValidationError.UINT, path);
      ctx.js(/* js */ `if(${r} < 0 || ${r} > 4294967295) return ${err};`);
    } else if (format === 'i8') {
      const err = ctx.err(ValidationError.INT, path);
      ctx.js(/* js */ `if(${r} < -128 || ${r} > 127) return ${err};`);
    } else if (format === 'i16') {
      const err = ctx.err(ValidationError.INT, path);
      ctx.js(/* js */ `if(${r} < -32768 || ${r} > 32767) return ${err};`);
    } else if (format === 'i32') {
      const err = ctx.err(ValidationError.INT, path);
      ctx.js(/* js */ `if(${r} < -2147483648 || ${r} > 2147483647) return ${err};`);
    }
  };

  if (format) customFormatValidation();
  ctx.emitCustomValidators(type, path, r);
};

export const str = (ctx: ValidatorCodegenContext, path: ValidationPath, r: string, type: Type): void => {
  const strType = type as any; // StrType
  const error = ctx.err(ValidationError.STR, path);
  ctx.js(/* js */ `if(typeof ${r} !== "string") return ${error};`);
  const {min, max, format, ascii} = strType.schema;
  if (typeof min === 'number' && min === max) {
    const err = ctx.err(ValidationError.STR_LEN, path);
    ctx.js(/* js */ `if(${r}.length !== ${min}) return ${err};`);
  } else {
    if (typeof min === 'number') {
      const err = ctx.err(ValidationError.STR_LEN, path);
      ctx.js(/* js */ `if(${r}.length < ${min}) return ${err};`);
    }
    if (typeof max === 'number') {
      const err = ctx.err(ValidationError.STR_LEN, path);
      ctx.js(/* js */ `if(${r}.length > ${max}) return ${err};`);
    }
  }

  if (format) {
    const formatErr = ctx.err(ValidationError.STR, path);
    if (format === 'ascii') {
      const validateFn = ctx.codegen.linkDependency(isAscii);
      ctx.js(/* js */ `if(!${validateFn}(${r})) return ${formatErr};`);
    } else if (format === 'utf8') {
      const validateFn = ctx.codegen.linkDependency(isUtf8);
      ctx.js(/* js */ `if(!${validateFn}(${r})) return ${formatErr};`);
    }
  } else if (ascii) {
    const asciiErr = ctx.err(ValidationError.STR, path);
    const validateFn = ctx.codegen.linkDependency(isAscii);
    ctx.js(/* js */ `if(!${validateFn}(${r})) return ${asciiErr};`);
  }

  ctx.emitCustomValidators(type, path, r);
};

export const bin = (ctx: ValidatorCodegenContext, path: ValidationPath, r: string, type: Type): void => {
  const binType = type as any; // BinType
  const {min, max} = binType.schema;
  const error = ctx.err(ValidationError.BIN, path);
  ctx.js(/* js */ `if(!(${r} instanceof Uint8Array)) return ${error};`);
  if (typeof min === 'number' && min === max) {
    const err = ctx.err(ValidationError.BIN_LEN, path);
    ctx.js(/* js */ `if(${r}.length !== ${min}) return ${err};`);
  } else {
    if (typeof min === 'number') {
      const err = ctx.err(ValidationError.BIN_LEN, path);
      ctx.js(/* js */ `if(${r}.length < ${min}) return ${err};`);
    }
    if (typeof max === 'number') {
      const err = ctx.err(ValidationError.BIN_LEN, path);
      ctx.js(/* js */ `if(${r}.length > ${max}) return ${err};`);
    }
  }
  ctx.emitCustomValidators(type, path, r);
};

export const const_ = (ctx: ValidatorCodegenContext, path: ValidationPath, r: string, type: Type): void => {
  const constType = type as any; // ConType
  const value = constType.value();
  const valueJs = JSON.stringify(value);
  const deepEqualName = ctx.codegen.linkDependency(require('@jsonjoy.com/util/lib/json-equal/deepEqual').deepEqual);
  const error = ctx.err(ValidationError.CONST, path);
  ctx.js(/* js */ `if(!${deepEqualName}(${r}, ${valueJs})) return ${error};`);
  ctx.emitCustomValidators(type, path, r);
};

export const arr = (ctx: ValidatorCodegenContext, path: ValidationPath, r: string, type: Type): void => {
  const arrType = type as any; // ArrType
  const rl = ctx.codegen.getRegister();
  const ri = ctx.codegen.getRegister();
  const rv = ctx.codegen.getRegister();
  const err = ctx.err(ValidationError.ARR, path);
  const errLen = ctx.err(ValidationError.ARR_LEN, path);
  const {min, max} = arrType.schema;
  ctx.js(/* js */ `if (!Array.isArray(${r})) return ${err};`);
  ctx.js(`var ${rl} = ${r}.length;`);
  if (min !== undefined) ctx.js(`if (${rl} < ${min}) return ${errLen};`);
  if (max !== undefined) ctx.js(`if (${rl} > ${max}) return ${errLen};`);
  ctx.js(`for (var ${rv}, ${ri} = ${r}.length; ${ri}-- !== 0;) {`);
  ctx.js(`${rv} = ${r}[${ri}];`);
  generate(ctx, [...path, {r: ri}], rv, arrType.type);
  ctx.js(`}`);
  ctx.emitCustomValidators(type, path, r);
};

export const tup = (ctx: ValidatorCodegenContext, path: ValidationPath, r: string, type: Type): void => {
  const tupType = type as any; // TupType
  const ri = ctx.codegen.getRegister();
  const rv = ctx.codegen.getRegister();
  const err = ctx.err(ValidationError.TUP, path);
  const errLen = ctx.err(ValidationError.ARR_LEN, path);
  const types = tupType.types;
  ctx.js(/* js */ `if (!Array.isArray(${r})) return ${err};`);
  ctx.js(`if (${r}.length !== ${types.length}) return ${errLen};`);
  for (let i = 0; i < types.length; i++) {
    ctx.js(`var ${rv} = ${r}[${i}];`);
    generate(ctx, [...path, {r: JSON.stringify(i)}], rv, types[i]);
  }
  ctx.emitCustomValidators(type, path, r);
};

export const obj = (
  ctx: ValidatorCodegenContext,
  path: ValidationPath,
  r: string,
  type: Type,
  validateFn: ValidatorFunction,
): void => {
  const objType = type as any; // ObjType
  const err = ctx.err(ValidationError.OBJ, path);
  ctx.js(/* js */ `if(!${r} || typeof ${r} !== "object" || Array.isArray(${r})) return ${err};`);

  const fields = objType.fields;
  const requiredFields: any[] = [];
  const optionalFields: any[] = [];
  
  for (const field of fields) {
    if (field.optional || field.constructor?.name === 'ObjectOptionalFieldType') {
      optionalFields.push(field);
    } else {
      requiredFields.push(field);
    }
  }

  // Validate required fields
  for (const field of requiredFields) {
    const key = field.key;
    const accessor = normalizeAccessor(key);
    const canSkipUndefinedCheck = canSkipObjectKeyUndefinedCheck(field.value);
    const rv = ctx.codegen.getRegister();
    
    if (canSkipUndefinedCheck) {
      ctx.js(`var ${rv} = ${r}${accessor};`);
      validateFn(ctx, [...path, {r: JSON.stringify(key)}], rv, field.value);
    } else {
      const keyErr = ctx.err(ValidationError.KEY, [...path, {r: JSON.stringify(key)}]);
      ctx.js(`var ${rv} = ${r}${accessor};`);
      ctx.js(`if (${rv} === undefined) return ${keyErr};`);
      validateFn(ctx, [...path, {r: JSON.stringify(key)}], rv, field.value);
    }
  }

  // Validate optional fields
  for (const field of optionalFields) {
    const key = field.key;
    const accessor = normalizeAccessor(key);
    const rv = ctx.codegen.getRegister();
    ctx.js(`var ${rv} = ${r}${accessor};`);
    ctx.js(`if (${rv} !== undefined) {`);
    validateFn(ctx, [...path, {r: JSON.stringify(key)}], rv, field.value);
    ctx.js(`}`);
  }

  // Check for unknown fields if necessary
  if (!ctx.options.skipObjectExtraFieldsCheck && !objType.schema.unknownFields) {
    const knownKeys = fields.map((field: any) => field.key);
    const unknownFieldsError = ctx.err(ValidationError.KEYS, path);
    const rk = ctx.codegen.getRegister();
    const rkl = ctx.codegen.getRegister();
    const ri = ctx.codegen.getRegister();
    const rkey = ctx.codegen.getRegister();
    ctx.js(`var ${rk} = Object.keys(${r}), ${rkl} = ${rk}.length, ${ri} = 0, ${rkey};`);
    ctx.js(`for (; ${ri} < ${rkl}; ${ri}++) {`);
    ctx.js(`${rkey} = ${rk}[${ri}];`);
    const knownKeysCheck = knownKeys.map((key: string) => `${rkey} !== ${JSON.stringify(key)}`).join(' && ');
    if (knownKeysCheck) {
      ctx.js(`if (${knownKeysCheck}) return ${unknownFieldsError};`);
    }
    ctx.js(`}`);
  }

  ctx.emitCustomValidators(type, path, r);
};

export const map = (
  ctx: ValidatorCodegenContext,
  path: ValidationPath,
  r: string,
  type: Type,
  validateFn: ValidatorFunction,
): void => {
  const mapType = type as any; // MapType
  const err = ctx.err(ValidationError.MAP, path);
  const rk = ctx.codegen.getRegister();
  const rkl = ctx.codegen.getRegister();
  const ri = ctx.codegen.getRegister();
  const rkey = ctx.codegen.getRegister();
  const rv = ctx.codegen.getRegister();
  
  ctx.js(/* js */ `if(!${r} || typeof ${r} !== "object" || Array.isArray(${r})) return ${err};`);
  ctx.js(`var ${rk} = Object.keys(${r}), ${rkl} = ${rk}.length, ${ri} = 0, ${rkey}, ${rv};`);
  ctx.js(`for (; ${ri} < ${rkl}; ${ri}++) {`);
  ctx.js(`${rkey} = ${rk}[${ri}];`);
  ctx.js(`${rv} = ${r}[${rkey}];`);
  validateFn(ctx, [...path, {r: rkey}], rv, mapType.valueType);
  ctx.js(`}`);
  ctx.emitCustomValidators(type, path, r);
};

export const ref = (
  ctx: ValidatorCodegenContext,
  path: ValidationPath,
  r: string,
  type: Type,
): void => {
  const refType = type as any; // RefType
  const system = ctx.options.system || refType.system;
  if (!system) throw new Error('NO_SYSTEM');
  const validator = system.resolve(refType.schema.ref).type.validator(ctx.options.errors);
  const d = ctx.codegen.linkDependency(validator);
  const rv = ctx.codegen.getRegister();
  ctx.js(`var ${rv} = ${d}(${r});`);
  ctx.js(`if (${rv}) return ${rv};`);
  ctx.emitCustomValidators(type, path, r);
};

export const or = (
  ctx: ValidatorCodegenContext,
  path: ValidationPath,
  r: string,
  type: Type,
  validateFn: ValidatorFunction,
): void => {
  const orType = type as any; // OrType
  const discriminator = orType.discriminator();
  const d = ctx.codegen.linkDependency(discriminator);
  const ri = ctx.codegen.getRegister();
  const types = orType.types;
  ctx.js(`var ${ri} = ${d}(${r});`);
  ctx.codegen.switch(
    ri,
    types.map((childType: Type, index: number) => [
      index,
      () => {
        validateFn(ctx, path, r, childType);
      },
    ]),
    () => {
      const err = ctx.err(ValidationError.OR, path);
      ctx.js(`return ${err};`);
    },
  );
  ctx.emitCustomValidators(type, path, r);
};

/**
 * Main router function that dispatches validation to the appropriate
 * validator function based on the type's kind.
 */
export const generate = (
  ctx: ValidatorCodegenContext,
  path: ValidationPath,
  r: string,
  type: Type,
): void => {
  const kind = type.getTypeName();

  switch (kind) {
    case 'any':
      any(ctx, path, r, type);
      break;
    case 'bool':
      bool(ctx, path, r, type);
      break;
    case 'num':
      num(ctx, path, r, type);
      break;
    case 'str':
      str(ctx, path, r, type);
      break;
    case 'bin':
      bin(ctx, path, r, type);
      break;
    case 'con':
      const_(ctx, path, r, type);
      break;
    case 'arr':
      arr(ctx, path, r, type);
      break;
    case 'tup':
      tup(ctx, path, r, type);
      break;
    case 'obj':
      obj(ctx, path, r, type, generate);
      break;
    case 'map':
      map(ctx, path, r, type, generate);
      break;
    case 'ref':
      ref(ctx, path, r, type);
      break;
    case 'or':
      or(ctx, path, r, type, generate);
      break;
    default:
      throw new Error(`${kind} type validation not implemented`);
  }
};