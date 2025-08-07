import {Codegen, CodegenStepExecJs} from '@jsonjoy.com/util/lib/codegen';
import {JsExpression} from '@jsonjoy.com/util/lib/codegen/util/JsExpression';
import {normalizeAccessor} from '@jsonjoy.com/codegen/lib/util/normalizeAccessor';
import {MaxEncodingOverhead, maxEncodingCapacity} from '@jsonjoy.com/util/lib/json-size';
import {BoolType, ConType, NumType, ObjKeyOptType} from '../../type';
import {lazy} from '@jsonjoy.com/util/lib/lazyFunction';
import type {ObjKeyType, ArrType, MapType, RefType, Type, OrType} from '../../type';
import {DiscriminatorCodegen} from '../discriminator';

export type CompiledCapacityEstimator = (value: unknown) => number;

const CACHE = new WeakMap<Type, CompiledCapacityEstimator>;

class IncrementSizeStep {
  constructor(public readonly inc: number) {}
}

export class CapacityEstimatorCodegen {
  public static readonly get = (type: Type, name?: string) => {
    const estimator = CACHE.get(type);
    if (estimator) return estimator;
    return lazy(() => {
      const codegen = new CapacityEstimatorCodegen(type, name);
      const r = codegen.codegen.options.args[0];
      const expression = new JsExpression(() => r);
      codegen.onNode(expression, type);
      const newEstimator = codegen.compile();
      CACHE.set(type, newEstimator);
      return newEstimator;
    });
  };

  public readonly codegen: Codegen<CompiledCapacityEstimator>;

  constructor(public readonly type: Type, name?: string) {
    this.codegen = new Codegen({
      name: 'approxSize' + (name ? '_' + name : ''),
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
      const isConstantSizeType = type instanceof ConType || type instanceof BoolType || type instanceof NumType;
      if (isConstantSizeType) {
        const elementSize = type instanceof ConType
          ? maxEncodingCapacity(type.literal())
          : type instanceof BoolType
            ? MaxEncodingOverhead.Boolean
            : MaxEncodingOverhead.Number;
        codegen.js(/* js */ `size += ${rLen} * ${elementSize};`);
      } else {
        const r = codegen.var(value.use());
        const ri = codegen.getRegister();
        codegen.js(/* js */ `for(var ${ri} = ${headLength}; ${ri} < ${rLen} - ${tailLength}; ${ri}++) {`);
        this.onNode(new JsExpression(() => /* js */ `${r}[${ri}]`), itemType);
        codegen.js(/* js */ `}`);
      }
    }
    if (headLength > 0) {
      const r = codegen.var(value.use());
      for (let i = 0; i < headLength; i++)
        this.onNode(new JsExpression(() => /* js */ `${r}[${i}]`), headType![i]);
    }
    if (tailLength > 0) {
      const r = codegen.var(value.use());
      for (let i = 0; i < tailLength; i++)
        this.onNode(new JsExpression(() => /* js */ `${r}[${rLen} - ${i + 1}]`), tailType![i]);
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
    this.inc(MaxEncodingOverhead.Object);
    const fields = objectType.fields;
    for (const f of fields) {
      const field = f as ObjKeyType<any, any>;
      const accessor = normalizeAccessor(field.key);
      const fieldExpression = new JsExpression(() => `${r}${accessor}`);
      const isOptional = field instanceof ObjKeyOptType;
      if (isOptional) {
        codegen.if(/* js */ `${JSON.stringify(field.key)} in ${r}`, () => {
          this.inc(MaxEncodingOverhead.ObjectElement);
          this.inc(maxEncodingCapacity(field.key));
          this.onNode(fieldExpression, field.val);
        });
      } else {
        this.inc(MaxEncodingOverhead.ObjectElement);
        this.inc(maxEncodingCapacity(field.key));
        this.onNode(fieldExpression, field.val);
      }
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
    const ri = codegen.var('0');
    codegen.js(/* js */ `for (; ${ri} < ${rLen}; ${ri}++) {`);
    codegen.js(/* js */ `${rKey} = ${rKeys}[${ri}];`);
    codegen.js(
      /* js */ `size += ${MaxEncodingOverhead.String} + ${MaxEncodingOverhead.StringLengthMultiplier} * ${rKey}.length;`,
    );
    this.onNode(new JsExpression(() => /* js */ `${r}[${rKey}]`), valueType);
    codegen.js(/* js */ `}`);
  }

  protected genRef(value: JsExpression, type: RefType<any>): void {
    const system = type.system;
    if (!system) throw new Error('NO_SYSTEM');
    const estimator = CapacityEstimatorCodegen.get(system.resolve(type.ref()).type);
    const d = this.codegen.linkDependency(estimator);
    this.codegen.js(/* js */ `size += ${d}(${value.use()});`);
  }

  protected genOr(value: JsExpression, type: OrType<any>): void {
    const codegen = this.codegen;
    const discriminator = DiscriminatorCodegen.get(type);
    const d = codegen.linkDependency(discriminator);
    const types = type.types;
    codegen.switch(
      /* js */ `${d}(${value.use()})`,
      types.map((childType: Type, index: number) => [
        index,
        () => {
          this.onNode(value, childType);
        },
      ]),
    );
  }

  protected onNode(value: JsExpression, type: Type): void {
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
        this.codegen.js(/* js */ `size += ${MaxEncodingOverhead.StringLengthMultiplier} * ${value.use()}.length;`);
        break;
      case 'bin':
        this.inc(MaxEncodingOverhead.Binary);
        this.codegen.js(/* js */ `size += ${MaxEncodingOverhead.BinaryLengthMultiplier} * ${value.use()}.length;`);
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
