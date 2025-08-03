import {Codegen, CodegenStepExecJs} from '@jsonjoy.com/util/lib/codegen';
import {JsExpression} from '@jsonjoy.com/util/lib/codegen/util/JsExpression';
import {normalizeAccessor} from '@jsonjoy.com/codegen/lib/util/normalizeAccessor';
import {MaxEncodingOverhead, maxEncodingCapacity} from '@jsonjoy.com/util/lib/json-size';
import {Value} from '../../value/Value';
import {BoolType, ConType, NumType, type ObjKeyType, type ArrType, type MapType, type RefType, type Type, ObjKeyOptType, OrType} from '../../type';
import type {TypeSystem} from '../../system';

export type CompiledCapacityEstimator = (value: unknown) => number;

const CACHE = new WeakMap<Type, CompiledCapacityEstimator>;

class IncrementSizeStep {
  constructor(public readonly inc: number) {}
}

export interface CapacityEstimatorCodegenOptions {
  /** Type for which to generate the encoder. */
  type: Type;

  /** Name to concatenate to the end of the generated function. */
  name?: string;
}

export class CapacityEstimatorCodegen {
  public static readonly get = (options: CapacityEstimatorCodegenOptions) => {
    const estimator = CACHE.get(options.type);
    if (estimator) return estimator;
    const codegen = new CapacityEstimatorCodegen(options);
    const r = codegen.codegen.options.args[0];
    const expression = new JsExpression(() => r);
    codegen.generate(expression, options.type);
    const newEstimator = codegen.compile();
    CACHE.set(options.type, newEstimator);
    return newEstimator;
  };

  public readonly codegen: Codegen<CompiledCapacityEstimator>;

  constructor(public readonly options: CapacityEstimatorCodegenOptions) {
    this.codegen = new Codegen({
      name: 'approxSize' + (options.name ? '_' + options.name : ''),
      args: ['r0'],
      prologue: /* js */ `var size = 0;`,
      epilogue: /* js */ `return size;`,
      processSteps: (steps) => {
        const stepsJoined: CodegenStepExecJs[] = [];
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          if (step instanceof CodegenStepExecJs) stepsJoined.push(step);
          else if (step instanceof IncrementSizeStep) {
            stepsJoined.push(new CodegenStepExecJs(/* js */ `size += ${step.inc};`));
          }
        }
        return stepsJoined;
      },
    });
    this.codegen.linkDependency(maxEncodingCapacity, 'maxEncodingCapacity');
  }

  public inc(inc: number): void {
    this.codegen.step(new IncrementSizeStep(inc));
  }

  public compile(): CompiledCapacityEstimator {
    return this.codegen.compile();
  }

  public compileForType(type: Type): CompiledCapacityEstimator {
    return CapacityEstimatorCodegen.get({...this.options, type});
  }

  protected genAny(value: JsExpression): void {
    const codegen = this.codegen;
    const r = codegen.var(value.use());
    codegen.js(/* js */ `size += maxEncodingCapacity(${r});`);
  };

  protected genArr(value: JsExpression, type: ArrType<any, any, any>): void {
    const codegen = this.codegen;
    this.inc(MaxEncodingOverhead.Array);
    const rLen = codegen.var(/* js */ `${value.use()}.length`);
    codegen.js(/* js */ `size += ${MaxEncodingOverhead.ArrayElement} * ${rLen}`);
    const itemType =  type._type as (Type | undefined);
    const headType = type._head as Type[] | undefined;
    const tailType = type._tail as Type[] | undefined;
    const headLength = headType ? headType.length : 0;
    const tailLength = tailType ? tailType.length : 0;
    if (itemType) {
      const fn = this.compileForType(itemType);
      const isConstantSizeType = type instanceof ConType || type instanceof BoolType || type instanceof NumType;
      if (isConstantSizeType) {
        const elementSize = fn(void 0);
        codegen.js(/* js */ `size += ${rLen} * ${elementSize};`);
      } else {
        const r = codegen.var(value.use());
        const rFn = codegen.linkDependency(fn);
        const ri = codegen.getRegister();
        codegen.js(/* js */ `for(var ${ri} = ${headLength}; ${ri} < ${rLen} - ${tailLength}; ${ri}++) size += ${rFn}(${r}[${ri}]);`);
      }
    }
    if (headLength > 0) {
      const r = codegen.var(value.use());
      for (let i = 0; i < headLength; i++) {
        const elementType = headType![i];
        const fn = this.compileForType(elementType);
        const rFn = codegen.linkDependency(fn);
        codegen.js(/* js */ `size += ${rFn}(${r}[${i}]);`);
      }
    }
    if (tailLength > 0) {
      const r = codegen.var(value.use());
      for (let i = 0; i < tailLength; i++) {
        const elementType = tailType![i];
        const fn = this.compileForType(elementType);
        const rFn = codegen.linkDependency(fn);
        codegen.js(/* js */ `size += ${rFn}(${r}[${rLen} - ${i + 1}]);`);
      }
    }
  }

  protected genObj(value: JsExpression, type: Type): void {
    const codegen = this.codegen;
    const r = codegen.var(value.use());
    const objectType = type as any; // ObjType
    const encodeUnknownFields = !!objectType.schema.encodeUnknownFields;
    if (encodeUnknownFields) {
      codegen.js(/* js */ `size += maxEncodingCapacity(${r});`);
      return;
    }
    const fields = objectType.fields;
    const overhead = MaxEncodingOverhead.Object + fields.length * MaxEncodingOverhead.ObjectElement;
    this.inc(overhead);
    for (const f of fields) {
      const field = f as {} as ObjKeyType<any, any>;
      this.inc(maxEncodingCapacity(field.key));
      const accessor = normalizeAccessor(field.key);
      const fieldExpression = new JsExpression(() => `${r}${accessor}`);
      const block = () => this.generate(fieldExpression, field.val);
      const isOptional = field instanceof ObjKeyOptType;
      if (isOptional) codegen.if(/* js */ `${JSON.stringify(field.key)} in ${r}`, block);
      else block();
    }
  }

  protected genMap(value: JsExpression, type: MapType<any>): void {
    const codegen = this.codegen;
    this.inc(MaxEncodingOverhead.Object);
    const r = codegen.var(value.use());
    const rKeys = codegen.var(/* js */ `Object.keys(${r})`);
    const rKey = codegen.var();
    const rLen = codegen.var(/* js */ `${rKeys}.length`);
    codegen.js(/* js */ `size += ${MaxEncodingOverhead.ObjectElement} * ${rLen}`);
    const valueType = type._value;
    const fn = this.compileForType(valueType);
    const rFn = codegen.linkDependency(fn);
    const ri = codegen.var('0');
    codegen.js(/* js */ `for (; ${ri} < ${rLen}; ${ri}++) {`);
    codegen.js(/* js */ `${rKey} = ${rKeys}[${ri}];`);
    codegen.js(
      /* js */ `size += ${MaxEncodingOverhead.String} + ${MaxEncodingOverhead.StringLengthMultiplier} * ${rKey}.length;`,
    );
    codegen.js(/* js */ `size += ${rFn}(${r}[${rKey}]);`);
    codegen.js(/* js */ `}`);
  }

  protected genRef(value: JsExpression, type: RefType<any>): void {
    const system = type.system;
    if (!system) throw new Error('NO_SYSTEM');
    const estimator = this.compileForType(system.resolve(type.ref()).type);
    const d = this.codegen.linkDependency(estimator);
    this.codegen.js(/* js */ `size += ${d}(${value.use()});`);
  }

  protected genOr(value: JsExpression, type: OrType<any>): void {
    const codegen = this.codegen;
    const discriminator = type.discriminator();
    const d = codegen.linkDependency(discriminator);
    const types = type.types;
    codegen.switch(
      /* js */ `${d}(${value.use()})`,
      types.map((childType: Type, index: number) => [
        index,
        () => {
          this.generate(value, childType);
        },
      ]),
    );
  }

  protected generate(value: JsExpression, type: Type): void {
    const kind = type.kind();
    switch (kind) {
      case 'any':
        this.genAny(value);
        break;
      case 'bool':
        this.inc(MaxEncodingOverhead.Boolean);
        break;
      case 'num':
        this.inc(MaxEncodingOverhead.Number);
        break;
      case 'str':
        this.inc(MaxEncodingOverhead.String);
        this.codegen.js(`size += ${MaxEncodingOverhead.StringLengthMultiplier} * ${value.use()}.length;`);
        break;
      case 'bin':
        this.inc(MaxEncodingOverhead.Binary);
        this.codegen.js(`size += ${MaxEncodingOverhead.BinaryLengthMultiplier} * ${value.use()}.length;`);
        break;
      case 'con':
        this.inc(maxEncodingCapacity((type as ConType).literal()));
        break;
      case 'arr':
        this.genArr(value, type as ArrType<any, any, any>);
        break;
      case 'obj':
        this.genObj(value, type);
        break;
      case 'map':
        this.genMap(value, type as MapType<any>);
        break;
      case 'ref':
        this.genRef(value, type as RefType<any>);
        break;
      case 'or':
        this.genOr(value, type as OrType<any>);
        break;
      default:
        throw new Error(`"${kind}" type capacity estimation not implemented`);
      }
  };
}
