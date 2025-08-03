import {Codegen, CodegenStepExecJs} from '@jsonjoy.com/util/lib/codegen';
import {JsExpression} from '@jsonjoy.com/util/lib/codegen/util/JsExpression';
import {normalizeAccessor} from '@jsonjoy.com/codegen/lib/util/normalizeAccessor';
import {MaxEncodingOverhead, maxEncodingCapacity} from '@jsonjoy.com/util/lib/json-size';
import {Value} from '../../value/Value';
import {BoolType, ConType, NumType, type ObjKeyType, type ArrType, type MapType, type RefType, type Type, ObjKeyOptType} from '../../type';
import type {TypeSystem} from '../../system';

export type CompiledCapacityEstimator = (value: unknown) => number;

const CACHE = new WeakMap<Type, CompiledCapacityEstimator>;

class IncrementSizeStep {
  constructor(public readonly inc: number) {}
}

export interface CapacityEstimatorCodegenOptions {
  /** Type for which to generate the encoder. */
  type: Type;

  /** Type system to use for alias and validator resolution. */
  system?: TypeSystem;

  /** Name to concatenate to the end of the generated function. */
  name?: string;
}

export class CapacityEstimatorCodegen {
  public static readonly compile = (options: CapacityEstimatorCodegenOptions) => {
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
      linkable: {
        Value,
      },
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

//   /**
//  * Standalone function to compile a capacity estimator for a given type.
//  */
// export const compile = (options: CapacityEstimatorCodegenOptions): CompiledCapacityEstimator => {
//   const ctx = new CapacityEstimatorCodegen(options);
//   const r = ctx.codegen.options.args[0];
//   const value = new JsExpression(() => r);
//   generate(ctx, value, options.type);
//   return ctx.compile();
// };


  public compile(): CompiledCapacityEstimator {
    return this.codegen.compile();
  }

  public compileForType(type: Type): CompiledCapacityEstimator {
    return CapacityEstimatorCodegen.compile({...this.options, type});
  }

  protected genAny(value: JsExpression): void {
    const codegen = this.codegen;
    codegen.link('Value');
    const r = codegen.var(value.use());
    codegen.if(
      `${r} instanceof Value`,
      () => {
        codegen.if(
          `${r}.type`,
          () => {
            codegen.js(`size += ${r}.type.capacityEstimator()(${r}.data);`);
          },
          () => {
            codegen.js(`size += maxEncodingCapacity(${r}.data);`);
          },
        );
      },
      () => {
        codegen.js(`size += maxEncodingCapacity(${r});`);
      },
    );
  };

  protected genArr(value: JsExpression, type: ArrType<any, any, any>): void {
    const codegen = this.codegen;
    this.inc(MaxEncodingOverhead.Array);
    const rLen = codegen.var(`${value.use()}.length`);
    codegen.js(`size += ${MaxEncodingOverhead.ArrayElement} * ${rLen}`);
    const elementType =  type._type as (Type | undefined);
    if (elementType) {
      const fn = this.compileForType(elementType);
      // TODO: Add support for head and tail types.
      const isConstantSizeType = type instanceof ConType || type instanceof BoolType || type instanceof NumType;
      if (isConstantSizeType) {
        const elementSize = fn(void 0);
        codegen.js(`size += ${rLen} * ${elementSize};`);
      } else {
        const r = codegen.var(value.use());
        const rFn = codegen.linkDependency(fn);
        const ri = codegen.getRegister();
        codegen.js(`for(var ${ri} = ${rLen}; ${ri}-- !== 0;) size += ${rFn}(${r}[${ri}]);`);
      }
    }
  }

// // const tup = (ctx: CapacityEstimatorCodegenContext, value: JsExpression, type: Type): void => {
// //   const codegen = ctx.codegen;
// //   const r = codegen.var(value.use());
// //   const tupleType = type as any; // TupType
// //   const types = tupleType.types;
// //   const overhead = MaxEncodingOverhead.Array + MaxEncodingOverhead.ArrayElement * types.length;
// //   ctx.inc(overhead);
// //   for (let i = 0; i < types.length; i++) {
// //     const elementType = types[i];
// //     const fn = elementType.compileCapacityEstimator({
// //       system: ctx.options.system,
// //       name: ctx.options.name,
// //     });
// //     const rFn = codegen.linkDependency(fn);
// //     codegen.js(`size += ${rFn}(${r}[${i}]);`);
// //   }
// // };

  protected genObj(value: JsExpression, type: Type): void {
    const codegen = this.codegen;
    const r = codegen.var(value.use());
    const objectType = type as any; // ObjType
    const encodeUnknownFields = !!objectType.schema.encodeUnknownFields;
    if (encodeUnknownFields) {
      codegen.js(`size += maxEncodingCapacity(${r});`);
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
      if (isOptional) codegen.if(`${JSON.stringify(field.key)} in ${r}`, block);
      else block();
    }
  }

// export const map = (ctx: CapacityEstimatorCodegen, value: JsExpression, type: MapType<any>): void => {
//   const codegen = ctx.codegen;
//   ctx.inc(MaxEncodingOverhead.Object);
//   const r = codegen.var(value.use());
//   const rKeys = codegen.var(`Object.keys(${r})`);
//   const rKey = codegen.var();
//   const rLen = codegen.var(`${rKeys}.length`);
//   codegen.js(`size += ${MaxEncodingOverhead.ObjectElement} * ${rLen}`);
//   const valueType = type._value;
//   const fn = compile({...ctx.options, type: valueType});
//   const rFn = codegen.linkDependency(fn);
//   const ri = codegen.var('0');
//   codegen.js(`for (; ${ri} < ${rLen}; ${ri}++) {`);
//   codegen.js(`${rKey} = ${rKeys}[${ri}];`);
//   codegen.js(`size += maxEncodingCapacity(${rKey}) + ${rFn}(${r}[${rKey}]);`);
//   codegen.js(`}`);
// };

// export const ref = (ctx: CapacityEstimatorCodegen, value: JsExpression, type: RefType<any>): void => {
//   const system = ctx.options.system || type.system;
//   if (!system) throw new Error('NO_SYSTEM');
//   const estimator = ctx.compileForType(system.resolve(type.ref()).type);
//   const d = ctx.codegen.linkDependency(estimator);
//   ctx.codegen.js(`size += ${d}(${value.use()});`);
// };

// export const or = (
//   ctx: CapacityEstimatorCodegen,
//   value: JsExpression,
//   type: Type,
//   estimateCapacityFn: EstimatorFunction,
// ): void => {
//   const codegen = ctx.codegen;
//   const orType = type as any; // OrType
//   const discriminator = orType.discriminator();
//   const d = codegen.linkDependency(discriminator);
//   const types = orType.types;
//   codegen.switch(
//     `${d}(${value.use()})`,
//     types.map((childType: Type, index: number) => [
//       index,
//       () => {
//         estimateCapacityFn(ctx, value, childType);
//       },
//     ]),
//   );
// };

  /**
   * Codegens an estimator for maximum capacity required to encode a given value
   * to some JSON-like encoding format.
   */
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
      // case 'map':
      //   map(ctx, value, type as MapType<any>);
      //   break;
      // case 'ref':
      //   ref(ctx, value, type as RefType<any>);
      //   break;
      // case 'or':
      //   or(ctx, value, type, generate);
      //   break;
      default:
        throw new Error(`"${kind}" type capacity estimation not implemented`);
      }
  };
}
