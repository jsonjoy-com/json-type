import {Codegen} from '@jsonjoy.com/codegen';
import {JsExpression} from '@jsonjoy.com/codegen/lib/util/JsExpression';
import {lazy} from '@jsonjoy.com/util/lib/lazyFunction';
import {ValidationError, ValidationErrorMessage} from '../../constants';
import {deepEqualCodegen} from '@jsonjoy.com/util/lib/json-equal/deepEqualCodegen';
import {AbstractCodegen} from '../AbstractCodege';
import {floats, ints, uints} from '../../util';
import {isAscii, isUtf8} from '../../util/stringFormats';
import {ObjKeyOptType, type AnyType, type ArrType, type BinType, type BoolType, type ConType, type MapType, type NumType, type ObjType, type OrType, type RefType, type StrType, type Type} from '../../type';
import {normalizeAccessor} from '@jsonjoy.com/codegen/lib/util/normalizeAccessor';
import {canSkipObjectKeyUndefinedCheck} from './util';
import type {JsonTypeValidator} from './types';
import type {SchemaPath} from '../types';
import {DiscriminatorCodegen} from '../discriminator';

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
    const equals = deepEqualCodegen(value);
    const fn = this.codegen.addConstant(equals);
    this.codegen.js(`if (!${fn}(${r.use()})) return ${this.err(ValidationError.CONST, path)}`);
    this.emitCustomValidators(path, r, type);
  }

  protected onBool(path: SchemaPath, r: JsExpression, type: BoolType): void {
    const error = this.err(ValidationError.BOOL, path);
    const codegen = this.codegen;
    codegen.js(/* js */ `if(typeof ${r.use()} !== "boolean") return ${error};`);
    this.emitCustomValidators(path, r, type);
  }

  protected onNum(path: SchemaPath, r: JsExpression, type: NumType): void {
    const codegen = this.codegen;
    const {format, gt, gte, lt, lte} = type.getSchema();
    if (format && ints.has(format)) {
      const errInt = this.err(ValidationError.INT, path);
      codegen.js(/* js */ `if(!Number.isInteger(${r.use()})) return ${errInt};`);
      if (uints.has(format)) {
        const err = this.err(ValidationError.UINT, path);
        codegen.js(/* js */ `if(${r.use()} < 0) return ${err};`);
        switch (format) {
          case 'u8': {
            codegen.js(/* js */ `if(${r.use()} > 0xFF) return ${err};`);
            break;
          }
          case 'u16': {
            codegen.js(/* js */ `if(${r.use()} > 0xFFFF) return ${err};`);
            break;
          }
          case 'u32': {
            codegen.js(/* js */ `if(${r.use()} > 0xFFFFFFFF) return ${err};`);
            break;
          }
        }
      } else {
        switch (format) {
          case 'i8': {
            codegen.js(/* js */ `if(${r.use()} > 0x7F || ${r.use()} < -0x80) return ${errInt};`);
            break;
          }
          case 'i16': {
            codegen.js(/* js */ `if(${r.use()} > 0x7FFF || ${r.use()} < -0x8000) return ${errInt};`);
            break;
          }
          case 'i32': {
            codegen.js(/* js */ `if(${r.use()} > 0x7FFFFFFF || ${r.use()} < -0x80000000) return ${errInt};`);
            break;
          }
        }
      }
    } else if (floats.has(format)) {
      const err = this.err(ValidationError.NUM, path);
      codegen.js(/* js */ `if(!Number.isFinite(${r.use()})) return ${err};`);
    } else {
      const err = this.err(ValidationError.NUM, path);
      codegen.js(/* js */ `if(typeof ${r.use()} !== "number") return ${err};`);
    }
    if (gt !== undefined) {
      const err = this.err(ValidationError.GT, path);
      codegen.js(/* js */ `if(${r.use()} <= ${gt}) return ${err};`);
    }
    if (gte !== undefined) {
      const err = this.err(ValidationError.GTE, path);
      codegen.js(/* js */ `if(${r.use()} < ${gte}) return ${err};`);
    }
    if (lt !== undefined) {
      const err = this.err(ValidationError.LT, path);
      codegen.js(/* js */ `if(${r.use()} >= ${lt}) return ${err};`);
    }
    if (lte !== undefined) {
      const err = this.err(ValidationError.LTE, path);
      codegen.js(/* js */ `if(${r.use()} > ${lte}) return ${err};`);
    }
    this.emitCustomValidators(path, r, type);
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
    const codegen = this.codegen;
    const rl = codegen.getRegister();
    const ri = codegen.getRegister();
    const rv = codegen.getRegister();
    const err = this.err(ValidationError.ARR, path);
    const errLen = this.err(ValidationError.ARR_LEN, path);
    const {min, max} = type.getSchema();
    codegen.js(/* js */ `if (!Array.isArray(${r.use()})) return ${err};`);
    codegen.js(/* js */ `var ${rl} = ${r.use()}.length;`);
    if (min !== undefined) codegen.js(/* js */ `if (${rl} < ${min}) return ${errLen};`);
    if (max !== undefined) codegen.js(/* js */ `if (${rl} > ${max}) return ${errLen};`);
    codegen.js(/* js */ `for (var ${rv}, ${ri} = ${r.use()}.length; ${ri}-- !== 0;) {`);
    codegen.js(/* js */ `${rv} = ${r.use()}[${ri}];`);
    this.onNode([...path, {r: ri}], new JsExpression(() => rv), type._type || type);
    codegen.js(/* js */ `}`);
    this.emitCustomValidators(path, r, type);
  }

  protected onObj(path: SchemaPath, r: JsExpression, type: ObjType): void {
    const codegen = this.codegen;
    const fields = type.fields;
    const length = fields.length;
    const canSkipObjectTypeCheck = this.options.unsafeMode && length > 0;
    if (!canSkipObjectTypeCheck) {
      const err = this.err(ValidationError.OBJ, path);
      codegen.js(/* js */ `if (typeof ${r.use()} !== 'object' || !${r.use()} || (${r.use()} instanceof Array)) return ${err};`);
    }
    const checkExtraKeys = length && !type.getOptions().unknownFields && !this.options.skipObjectExtraFieldsCheck;
    if (checkExtraKeys) {
      const rk = codegen.getRegister();
      codegen.js(/* js */ `for (var ${rk} in ${r.use()}) {`);
      codegen.js(
        /* js */ `switch (${rk}) { case ${fields
          .map((field) => JSON.stringify(field.key))
          .join(': case ')}: break; default: return ${this.err(ValidationError.KEYS, [...path, {r: rk}])};}`,
      );
      codegen.js(/* js */ `}`);
    }
    for (let i = 0; i < length; i++) {
      const field = fields[i];
      const rv = codegen.getRegister();
      const accessor = normalizeAccessor(field.key);
      const keyPath = [...path, field.key];
      codegen.js(/* js */ `var ${rv} = ${r.use()}${accessor};`);
      if (field instanceof ObjKeyOptType) {
        codegen.js(/* js */ `if (${rv} !== undefined) {`);
        this.onNode(keyPath, new JsExpression(() => rv), field.val);
        codegen.js(/* js */ `}`);
      } else {
        if (!canSkipObjectKeyUndefinedCheck(field.val.kind())) {
          const err = this.err(ValidationError.KEY, [...path, field.key]);
          codegen.js(/* js */ `var ${rv} = ${r.use()}${accessor};`);
          codegen.js(/* js */ `if (!(${JSON.stringify(field.key)} in ${r.use()})) return ${err};`);
        }
        this.onNode(keyPath, new JsExpression(() => rv), field.val);
      }
    }
    this.emitCustomValidators(path, r, type);
  }

  protected onMap(path: SchemaPath, r: JsExpression, type: MapType): void {
    const codegen = this.codegen;
    const err = this.err(ValidationError.MAP, path);
    const rMap = codegen.var(r.use());
    codegen.js(/* js */ `if (!${rMap} || (typeof ${rMap} !== 'object') || (${rMap}.constructor !== Object)) return ${err};`);
    const rKeys = codegen.var(/* js */ `Object.keys(${rMap});`);
    const rLength = codegen.var(/* js */ `${rKeys}.length`);
    const rKey = codegen.r();
    codegen.js(/* js */ `for (var ${rKey}, i = 0; i < ${rLength}; i++) {`);
    codegen.js(/* js */ `${rKey} = ${rKeys}[i];`);
    this.onNode([...path, {r: rKey}], new JsExpression(() => /* js */ `${rMap}[${rKey}]`), type._value);
    codegen.js(/* js */ `}`);
    this.emitCustomValidators(path, r, type);
  }

  protected onRef(path: SchemaPath, r: JsExpression, type: RefType): void {
    const {options, codegen} = this;
    const ref = type.ref();
    const refErr = (errorRegister: string): string => {
      switch (options.errors) {
        case 'boolean':
          return errorRegister;
        case 'string': {
          return this.err(ValidationError.REF, [...path, {r: errorRegister}]);
        }
        // case 'object':
        default: {
          return this.err(ValidationError.REF, [...path], {
            refId: ref,
            refError: errorRegister,
          });
        }
      }
    };
    const system = type.system;
    if (!system) throw new Error('NO_SYSTEM');
    const alias = system.resolve(ref);
    const validator = ValidatorCodegen.get({...options, type: alias.type});
    const d = codegen.linkDependency(validator);
    const rerr = codegen.getRegister();
    codegen.js(/* js */ `var ${rerr} = ${d}(${r.use()});`);
    codegen.js(/* js */ `if (${rerr}) return ${refErr(rerr)};`);
  }

  protected onOr(path: SchemaPath, r: JsExpression, type: OrType): void {
    const types = type.types as Type[];
    const codegen = this.codegen;
    const length = types.length;
    if (length === 1) {
      this.onNode(path, r, types[0]);
      return;
    }
    const discriminator = DiscriminatorCodegen.get(type);
    const d = codegen.linkDependency(discriminator);
    codegen.switch(
      /* js */ `${d}(${r.use()})`,
      types.map((caseType, index) => [
        index,
        () => {
          this.onNode(path, r, caseType);
        },
      ]),
      () => {
        const err = this.err(ValidationError.OR, path);
        codegen.js(`return ${err}`);
      },
    );
  }
}
