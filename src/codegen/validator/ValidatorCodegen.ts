import {Codegen} from '@jsonjoy.com/codegen';
import {JsExpression} from '@jsonjoy.com/codegen/lib/util/JsExpression';
import {lazy} from '@jsonjoy.com/util/lib/lazyFunction';
import {ValidationError, ValidationErrorMessage} from '../../constants';
import {deepEqual} from '@jsonjoy.com/util/lib/json-equal/deepEqual';
import {AbstractCodegen} from '../AbstractCodege';
import {isAscii, isUtf8} from '../../util/stringFormats';
// import {isAscii, isUtf8} from '../../util/stringFormats';
// import {canSkipObjectKeyUndefinedCheck} from './util';
// import {normalizeAccessor} from '@jsonjoy.com/util/lib/codegen/util/normalizeAccessor';
// import type {TypeSystem} from '../../system';
import type {AnyType, ArrType, BinType, BoolType, ConType, MapType, NumType, ObjType, OrType, RefType, StrType, Type} from '../../type';
import type {JsonTypeValidator} from './types';
import type {SchemaPath} from '../types';

const CACHE = new WeakMap<Type, (value: unknown) => void>;

export interface ValidatorCodegenOptions {
  /** Type for which to generate the validator. */
  type: Type;

  /**
   * Specifies how errors should be reported. The validator always returns a truthy
   * value on error, and falsy value on success. Depending on the value of this
   * option, the validator will either return boolean, string, or object on error.
   *
   * - `"boolean"`: The validator will return `true` on error, and `false` on success.
   * - `"string"`: The validator will return a string on error, and empty string `""`
   *   on success. The error string contains error code and path where error happened
   *   serialized as JSON.
   * - `"object"`: The validator will return an object on error, and `null` on success. The
   *   error object contains error code and path where error happened as well as human readable
   *   description of the error.
   *
   * Use `"boolean"` for best performance.
   */
  errors: 'boolean' | 'string' | 'object';

  /**
   * When an object type does not have "extraFields" set to true, the validator
   * will check that there are not excess fields besides those explicitly
   * defined. This settings removes this check.
   *
   * It may be useful when validating incoming data in RPC request as extra fields
   * would not hurt, but removing this check may improve performance. In one
   * micro-benchmark, this setting improves performance 5x. See json-type/validator.js benchmark.
   */
  skipObjectExtraFieldsCheck?: boolean;

  /**
   * In unsafe mode the validator will skip some checks which may result in
   * error being thrown. When running validators in unsafe mode, it is assumed
   * that the code is wrapped in a try-catch block. Micro-benchmarks DO NOT show
   * that this setting improves performance much.
   */
  unsafeMode?: boolean;
}

export class ValidatorCodegen extends AbstractCodegen {
  public static readonly get = (options: ValidatorCodegenOptions) => {
    const type = options.type;
    const fn = CACHE.get(type);
    if (fn) return fn;
    const codegen = new ValidatorCodegen(options);
    return lazy(() => {
      const r = codegen.codegen.options.args[0];
      const expression = new JsExpression(() => r);
      codegen.onNode([], expression, type);
      const newFn = codegen.compile();
      CACHE.set(type, newFn);
      return newFn;
    });
  };

  public readonly options: ValidatorCodegenOptions;
  public readonly codegen: Codegen;

  constructor(options: ValidatorCodegenOptions) {
    super();
    this.options = {
      skipObjectExtraFieldsCheck: false,
      unsafeMode: false,
      ...options,
    };
    const successResult =
      this.options.errors === 'boolean' ? 'false' : this.options.errors === 'string' ? "''" : 'null';
    this.codegen = new Codegen<JsonTypeValidator>({
      epilogue: `return ${successResult};`,
      linkable: {
        deepEqual,
      }
    });
  }

  /**
   * Generates an error message. The type of message form is dictated by
   * the `options.errors` setting.
   */
  public err(
    code: ValidationError,
    path: SchemaPath,
    opts: {refId?: string; refError?: string; validator?: string} = {},
  ): string {
    switch (this.options.errors) {
      case 'boolean':
        return 'true';
      case 'string': {
        let out = "'[" + JSON.stringify(ValidationError[code]);
        for (const step of path) {
          if (typeof step === 'object') {
            out += ",' + JSON.stringify(" + step.r + ") + '";
          } else {
            out += ',' + JSON.stringify(step);
          }
        }
        return out + "]'";
      }
      // case 'object':
      default: {
        let out =
          '{code: ' +
          JSON.stringify(ValidationError[code]) +
          ', errno: ' +
          JSON.stringify(code) +
          ', message: ' +
          JSON.stringify(ValidationErrorMessage[code]) +
          ', path: [';
        let i = 0;
        for (const step of path) {
          if (i) out += ', ';
          if (typeof step === 'object') {
            out += step.r;
          } else {
            out += JSON.stringify(step);
          }
          i++;
        }
        out += ']';
        if (opts.refId) {
          out += ', refId: ' + JSON.stringify(opts.refId);
        }
        if (opts.refError) {
          out += ', ref: ' + opts.refError;
        }
        if (opts.validator) {
          out += ', validator: ' + JSON.stringify(opts.validator);
        }
        return out + '}';
      }
    }
  }

  public emitCustomValidators(path: SchemaPath, r: JsExpression, node: Type): void {
    const validators = node.validators;
    const codegen = this.codegen;
    for (const validator of validators) {
      const v = this.codegen.linkDependency(validator);
      const error = this.err(ValidationError.VALIDATION, path);
      codegen.js(/* js */ `try{${v}(${r.use()})}catch(e){return ${error}}`);
    }
  }

  protected onAny(path: SchemaPath, r: JsExpression, type: AnyType): void {
    this.emitCustomValidators(path, r, type);
  }

  protected onCon(path: SchemaPath, r: JsExpression, type: ConType): void {
    const value = type.literal();
    const valueJs = JSON.stringify(value);
    this.codegen.link('deepEqual');
    const error = this.err(ValidationError.CONST, path);
    this.codegen.js(/* js */ `if(!deepEqual(${r.use()}, ${valueJs})) return ${error};`);
    this.emitCustomValidators(path, r, type);
  }

  protected onBool(path: SchemaPath, r: JsExpression, type: BoolType): void {
    const error = this.err(ValidationError.BOOL, path);
    const codegen = this.codegen;
    codegen.js(/* js */ `if(typeof ${r.use()} !== "boolean") return ${error};`);
    this.emitCustomValidators(path, r, type);
  }

  protected onNum(path: SchemaPath, r: JsExpression, type: NumType): void {
    throw new Error('not implemented');
  }

  protected onStr(path: SchemaPath, r: JsExpression, type: StrType): void {
    const codegen = this.codegen;
    const error = this.err(ValidationError.STR, path);
    codegen.js(/* js */ `if(typeof ${r.use()} !== "string") return ${error};`);
    const {min, max, format, ascii} = type.getSchema();
    if (typeof min === 'number' && min === max) {
      const err = this.err(ValidationError.STR_LEN, path);
      codegen.js(/* js */ `if(${r.use()}.length !== ${min}) return ${err};`);
    } else {
      if (typeof min === 'number') {
        const err = this.err(ValidationError.STR_LEN, path);
        codegen.js(/* js */ `if(${r.use()}.length < ${min}) return ${err};`);
      }
      if (typeof max === 'number') {
        const err = this.err(ValidationError.STR_LEN, path);
        codegen.js(/* js */ `if(${r.use()}.length > ${max}) return ${err};`);
      }
    }
    if (format) {
      const formatErr = this.err(ValidationError.STR, path);
      if (format === 'ascii') {
        const validateFn = codegen.linkDependency(isAscii);
        codegen.js(/* js */ `if(!${validateFn}(${r.use()})) return ${formatErr};`);
      } else if (format === 'utf8') {
        const validateFn = codegen.linkDependency(isUtf8);
        codegen.js(/* js */ `if(!${validateFn}(${r.use()})) return ${formatErr};`);
      }
    } else if (ascii) {
      const asciiErr = this.err(ValidationError.STR, path);
      const validateFn = codegen.linkDependency(isAscii);
      codegen.js(/* js */ `if(!${validateFn}(${r.use()})) return ${asciiErr};`);
    }
    this.emitCustomValidators(path, r, type);
  }

  protected onBin(path: SchemaPath, r: JsExpression, type: BinType): void {
    const {min, max} = type.getSchema();
    const error = this.err(ValidationError.BIN, path);
    const codegen = this.codegen;
    this.codegen.js(/* js */ `if(!(${r.use()} instanceof Uint8Array)) return ${error};`);
    if (typeof min === 'number' && min === max) {
      const err = this.err(ValidationError.BIN_LEN, path);
      codegen.js(/* js */ `if(${r.use()}.length !== ${min}) return ${err};`);
    } else {
      if (typeof min === 'number') {
        const err = this.err(ValidationError.BIN_LEN, path);
        codegen.js(/* js */ `if(${r.use()}.length < ${min}) return ${err};`);
      }
      if (typeof max === 'number') {
        const err = this.err(ValidationError.BIN_LEN, path);
        codegen.js(/* js */ `if(${r.use()}.length > ${max}) return ${err};`);
      }
    }
    this.emitCustomValidators(path, r, type);
  }

  protected onArr(path: SchemaPath, r: JsExpression, type: ArrType): void {
    throw new Error('not implemented');
  }

  protected onObj(path: SchemaPath, r: JsExpression, type: ObjType): void {
    throw new Error('not implemented');
  }

  protected onMap(path: SchemaPath, r: JsExpression, type: MapType): void {
    throw new Error('not implemented');
  }

  protected onRef(path: SchemaPath, r: JsExpression, type: RefType): void {
    throw new Error('not implemented');
  }

  protected onOr(path: SchemaPath, r: JsExpression, type: OrType): void {
    throw new Error('not implemented');
  }

// export const num = (ctx: ValidatorCodegenContext, path: ValidationPath, r: string, type: Type): void => {
//   const numType = type as any; // NumType
//   const {format, gte, gt, lte, lt, int} = numType.schema;
//   const error = ctx.err(ValidationError.NUM, path);
//   ctx.js(/* js */ `if(typeof ${r} !== "number") return ${error};`);

//   if (int || format) {
//     const intErr = ctx.err(ValidationError.INT, path);
//     ctx.js(/* js */ `if(${r} !== (${r} | 0)) return ${intErr};`);
//   }

//   if (typeof gte === 'number') {
//     const err = ctx.err(ValidationError.GTE, path);
//     ctx.js(/* js */ `if(${r} < ${gte}) return ${err};`);
//   }
//   if (typeof gt === 'number') {
//     const err = ctx.err(ValidationError.GT, path);
//     ctx.js(/* js */ `if(${r} <= ${gt}) return ${err};`);
//   }
//   if (typeof lte === 'number') {
//     const err = ctx.err(ValidationError.LTE, path);
//     ctx.js(/* js */ `if(${r} > ${lte}) return ${err};`);
//   }
//   if (typeof lt === 'number') {
//     const err = ctx.err(ValidationError.LT, path);
//     ctx.js(/* js */ `if(${r} >= ${lt}) return ${err};`);
//   }

//   const customFormatValidation = () => {
//     if (format === 'u8') {
//       const err = ctx.err(ValidationError.UINT, path);
//       ctx.js(/* js */ `if(${r} < 0 || ${r} > 255) return ${err};`);
//     } else if (format === 'u16') {
//       const err = ctx.err(ValidationError.UINT, path);
//       ctx.js(/* js */ `if(${r} < 0 || ${r} > 65535) return ${err};`);
//     } else if (format === 'u32') {
//       const err = ctx.err(ValidationError.UINT, path);
//       ctx.js(/* js */ `if(${r} < 0 || ${r} > 4294967295) return ${err};`);
//     } else if (format === 'i8') {
//       const err = ctx.err(ValidationError.INT, path);
//       ctx.js(/* js */ `if(${r} < -128 || ${r} > 127) return ${err};`);
//     } else if (format === 'i16') {
//       const err = ctx.err(ValidationError.INT, path);
//       ctx.js(/* js */ `if(${r} < -32768 || ${r} > 32767) return ${err};`);
//     } else if (format === 'i32') {
//       const err = ctx.err(ValidationError.INT, path);
//       ctx.js(/* js */ `if(${r} < -2147483648 || ${r} > 2147483647) return ${err};`);
//     }
//   };

//   if (format) customFormatValidation();
//   ctx.emitCustomValidators(type, path, r);
// };

// export const arr = (ctx: ValidatorCodegenContext, path: ValidationPath, r: string, type: Type): void => {
//   const arrType = type as any; // ArrType
//   const rl = ctx.codegen.getRegister();
//   const ri = ctx.codegen.getRegister();
//   const rv = ctx.codegen.getRegister();
//   const err = ctx.err(ValidationError.ARR, path);
//   const errLen = ctx.err(ValidationError.ARR_LEN, path);
//   const {min, max} = arrType.schema;
//   ctx.js(/* js */ `if (!Array.isArray(${r})) return ${err};`);
//   ctx.js(`var ${rl} = ${r}.length;`);
//   if (min !== undefined) ctx.js(`if (${rl} < ${min}) return ${errLen};`);
//   if (max !== undefined) ctx.js(`if (${rl} > ${max}) return ${errLen};`);
//   ctx.js(`for (var ${rv}, ${ri} = ${r}.length; ${ri}-- !== 0;) {`);
//   ctx.js(`${rv} = ${r}[${ri}];`);
//   generate(ctx, [...path, {r: ri}], rv, arrType.type);
//   ctx.js(`}`);
//   ctx.emitCustomValidators(type, path, r);
// };

// export const tup = (ctx: ValidatorCodegenContext, path: ValidationPath, r: string, type: Type): void => {
//   const tupType = type as any; // TupType
//   const ri = ctx.codegen.getRegister();
//   const rv = ctx.codegen.getRegister();
//   const err = ctx.err(ValidationError.TUP, path);
//   const errLen = ctx.err(ValidationError.ARR_LEN, path);
//   const types = tupType.types;
//   ctx.js(/* js */ `if (!Array.isArray(${r})) return ${err};`);
//   ctx.js(`if (${r}.length !== ${types.length}) return ${errLen};`);
//   for (let i = 0; i < types.length; i++) {
//     ctx.js(`var ${rv} = ${r}[${i}];`);
//     generate(ctx, [...path, {r: JSON.stringify(i)}], rv, types[i]);
//   }
//   ctx.emitCustomValidators(type, path, r);
// };

// export const obj = (
//   ctx: ValidatorCodegenContext,
//   path: ValidationPath,
//   r: string,
//   type: Type,
//   validateFn: ValidatorFunction,
// ): void => {
//   const objType = type as any; // ObjType
//   const err = ctx.err(ValidationError.OBJ, path);
//   ctx.js(/* js */ `if(!${r} || typeof ${r} !== "object" || Array.isArray(${r})) return ${err};`);

//   const fields = objType.fields;
//   const requiredFields: any[] = [];
//   const optionalFields: any[] = [];

//   for (const field of fields) {
//     if (field.optional || field.constructor?.name === 'ObjectOptionalFieldType') {
//       optionalFields.push(field);
//     } else {
//       requiredFields.push(field);
//     }
//   }

//   // Validate required fields
//   for (const field of requiredFields) {
//     const key = field.key;
//     const accessor = normalizeAccessor(key);
//     const canSkipUndefinedCheck = canSkipObjectKeyUndefinedCheck(field.value);
//     const rv = ctx.codegen.getRegister();

//     if (canSkipUndefinedCheck) {
//       ctx.js(`var ${rv} = ${r}${accessor};`);
//       validateFn(ctx, [...path, {r: JSON.stringify(key)}], rv, field.value);
//     } else {
//       const keyErr = ctx.err(ValidationError.KEY, [...path, {r: JSON.stringify(key)}]);
//       ctx.js(`var ${rv} = ${r}${accessor};`);
//       ctx.js(`if (${rv} === undefined) return ${keyErr};`);
//       validateFn(ctx, [...path, {r: JSON.stringify(key)}], rv, field.value);
//     }
//   }

//   // Validate optional fields
//   for (const field of optionalFields) {
//     const key = field.key;
//     const accessor = normalizeAccessor(key);
//     const rv = ctx.codegen.getRegister();
//     ctx.js(`var ${rv} = ${r}${accessor};`);
//     ctx.js(`if (${rv} !== undefined) {`);
//     validateFn(ctx, [...path, {r: JSON.stringify(key)}], rv, field.value);
//     ctx.js(`}`);
//   }

//   // Check for unknown fields if necessary
//   if (!ctx.options.skipObjectExtraFieldsCheck && !objType.schema.unknownFields) {
//     const knownKeys = fields.map((field: any) => field.key);
//     const unknownFieldsError = ctx.err(ValidationError.KEYS, path);
//     const rk = ctx.codegen.getRegister();
//     const rkl = ctx.codegen.getRegister();
//     const ri = ctx.codegen.getRegister();
//     const rkey = ctx.codegen.getRegister();
//     ctx.js(`var ${rk} = Object.keys(${r}), ${rkl} = ${rk}.length, ${ri} = 0, ${rkey};`);
//     ctx.js(`for (; ${ri} < ${rkl}; ${ri}++) {`);
//     ctx.js(`${rkey} = ${rk}[${ri}];`);
//     const knownKeysCheck = knownKeys.map((key: string) => `${rkey} !== ${JSON.stringify(key)}`).join(' && ');
//     if (knownKeysCheck) {
//       ctx.js(`if (${knownKeysCheck}) return ${unknownFieldsError};`);
//     }
//     ctx.js(`}`);
//   }

//   ctx.emitCustomValidators(type, path, r);
// };

// export const map = (
//   ctx: ValidatorCodegenContext,
//   path: ValidationPath,
//   r: string,
//   type: Type,
//   validateFn: ValidatorFunction,
// ): void => {
//   const mapType = type as any; // MapType
//   const err = ctx.err(ValidationError.MAP, path);
//   const rk = ctx.codegen.getRegister();
//   const rkl = ctx.codegen.getRegister();
//   const ri = ctx.codegen.getRegister();
//   const rkey = ctx.codegen.getRegister();
//   const rv = ctx.codegen.getRegister();

//   ctx.js(/* js */ `if(!${r} || typeof ${r} !== "object" || Array.isArray(${r})) return ${err};`);
//   ctx.js(`var ${rk} = Object.keys(${r}), ${rkl} = ${rk}.length, ${ri} = 0, ${rkey}, ${rv};`);
//   ctx.js(`for (; ${ri} < ${rkl}; ${ri}++) {`);
//   ctx.js(`${rkey} = ${rk}[${ri}];`);
//   ctx.js(`${rv} = ${r}[${rkey}];`);
//   validateFn(ctx, [...path, {r: rkey}], rv, mapType.valueType);
//   ctx.js(`}`);
//   ctx.emitCustomValidators(type, path, r);
// };

// export const ref = (ctx: ValidatorCodegenContext, path: ValidationPath, r: string, type: Type): void => {
//   const refType = type as any; // RefType
//   const system = ctx.options.system || refType.system;
//   if (!system) throw new Error('NO_SYSTEM');
//   const validator = system.resolve(refType.schema.ref).type.validator(ctx.options.errors);
//   const d = ctx.codegen.linkDependency(validator);
//   const rv = ctx.codegen.getRegister();
//   ctx.js(`var ${rv} = ${d}(${r});`);
//   ctx.js(`if (${rv}) return ${rv};`);
//   ctx.emitCustomValidators(type, path, r);
// };

// export const or = (
//   ctx: ValidatorCodegenContext,
//   path: ValidationPath,
//   r: string,
//   type: Type,
//   validateFn: ValidatorFunction,
// ): void => {
//   const orType = type as any; // OrType
//   const discriminator = orType.discriminator();
//   const d = ctx.codegen.linkDependency(discriminator);
//   const ri = ctx.codegen.getRegister();
//   const types = orType.types;
//   ctx.js(`var ${ri} = ${d}(${r});`);
//   ctx.codegen.switch(
//     ri,
//     types.map((childType: Type, index: number) => [
//       index,
//       () => {
//         validateFn(ctx, path, r, childType);
//       },
//     ]),
//     () => {
//       const err = ctx.err(ValidationError.OR, path);
//       ctx.js(`return ${err};`);
//     },
//   );
//   ctx.emitCustomValidators(type, path, r);
// };
}
