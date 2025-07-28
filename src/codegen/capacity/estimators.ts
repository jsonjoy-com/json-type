import {JsExpression} from '@jsonjoy.com/util/lib/codegen/util/JsExpression';
import {MaxEncodingOverhead, maxEncodingCapacity} from '@jsonjoy.com/util/lib/json-size';
import {CapacityEstimatorCodegenContext} from './CapacityEstimatorCodegenContext';
import type {
  CapacityEstimatorCodegenContextOptions,
  CompiledCapacityEstimator,
} from './CapacityEstimatorCodegenContext';
import type {Type} from '../../type';
import type {ConType} from '../../type/classes/ConType';

type EstimatorFunction = (ctx: CapacityEstimatorCodegenContext, value: JsExpression, type: Type) => void;

const normalizeAccessor = (key: string): string => {
  // Simple property access for valid identifiers, bracket notation otherwise
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
    return `.${key}`;
  }
  return `[${JSON.stringify(key)}]`;
};

export const any = (ctx: CapacityEstimatorCodegenContext, value: JsExpression, type: Type): void => {
  const codegen = ctx.codegen;
  codegen.link('Value');
  const r = codegen.var(value.use());
  codegen.if(
    `${r} instanceof Value`,
    () => {
      codegen.if(
        `${r}.type`,
        () => {
          ctx.codegen.js(`size += ${r}.type.capacityEstimator()(${r}.data);`);
        },
        () => {
          ctx.codegen.js(`size += maxEncodingCapacity(${r}.data);`);
        },
      );
    },
    () => {
      ctx.codegen.js(`size += maxEncodingCapacity(${r});`);
    },
  );
};

export const bool = (ctx: CapacityEstimatorCodegenContext, value: JsExpression): void => {
  ctx.inc(MaxEncodingOverhead.Boolean);
};

export const num = (ctx: CapacityEstimatorCodegenContext, value: JsExpression): void => {
  ctx.inc(MaxEncodingOverhead.Number);
};

export const str = (ctx: CapacityEstimatorCodegenContext, value: JsExpression): void => {
  ctx.inc(MaxEncodingOverhead.String);
  ctx.codegen.js(`size += ${MaxEncodingOverhead.StringLengthMultiplier} * ${value.use()}.length;`);
};

export const bin = (ctx: CapacityEstimatorCodegenContext, value: JsExpression): void => {
  ctx.inc(MaxEncodingOverhead.Binary);
  ctx.codegen.js(`size += ${MaxEncodingOverhead.BinaryLengthMultiplier} * ${value.use()}.length;`);
};

export const const_ = (ctx: CapacityEstimatorCodegenContext, value: JsExpression, type: Type): void => {
  const constType = type as ConType;
  ctx.inc(maxEncodingCapacity(constType.value()));
};

export const arr = (ctx: CapacityEstimatorCodegenContext, value: JsExpression, type: Type): void => {
  const codegen = ctx.codegen;
  ctx.inc(MaxEncodingOverhead.Array);
  const rLen = codegen.var(`${value.use()}.length`);
  const arrayType = type as any; // ArrType
  const elementType = arrayType.type;
  codegen.js(`size += ${MaxEncodingOverhead.ArrayElement} * ${rLen}`);
  const fn = elementType.compileCapacityEstimator({
    system: ctx.options.system,
    name: ctx.options.name,
  });
  const isConstantSizeType = ['con', 'bool', 'num'].includes(elementType.getTypeName());
  if (isConstantSizeType) {
    const rFn = codegen.linkDependency(fn);
    codegen.js(`size += ${rLen} * ${rFn}(${elementType.random()});`);
  } else {
    const rFn = codegen.linkDependency(fn);
    const ri = codegen.var('0');
    codegen.js(`for (; ${ri} < ${rLen}; ${ri}++) {`);
    codegen.js(`size += ${rFn}(${value.use()}[${ri}]);`);
    codegen.js(`}`);
  }
};

export const tup = (ctx: CapacityEstimatorCodegenContext, value: JsExpression, type: Type): void => {
  const codegen = ctx.codegen;
  const r = codegen.var(value.use());
  const tupleType = type as any; // TupType
  const types = tupleType.types;
  const overhead = MaxEncodingOverhead.Array + MaxEncodingOverhead.ArrayElement * types.length;
  ctx.inc(overhead);
  for (let i = 0; i < types.length; i++) {
    const elementType = types[i];
    const fn = elementType.compileCapacityEstimator({
      system: ctx.options.system,
      name: ctx.options.name,
    });
    const rFn = codegen.linkDependency(fn);
    codegen.js(`size += ${rFn}(${r}[${i}]);`);
  }
};

export const obj = (
  ctx: CapacityEstimatorCodegenContext,
  value: JsExpression,
  type: Type,
  estimateCapacityFn: EstimatorFunction,
): void => {
  const codegen = ctx.codegen;
  const r = codegen.var(value.use());
  const objectType = type as any; // ObjType
  const encodeUnknownFields = !!objectType.schema.encodeUnknownFields;
  if (encodeUnknownFields) {
    codegen.js(`size += maxEncodingCapacity(${r});`);
    return;
  }
  const fields = objectType.fields;
  const overhead = MaxEncodingOverhead.Object + fields.length * MaxEncodingOverhead.ObjectElement;
  ctx.inc(overhead);
  for (const field of fields) {
    ctx.inc(maxEncodingCapacity(field.key));
    const accessor = normalizeAccessor(field.key);
    const isOptional = field.optional || field.constructor?.name === 'ObjectOptionalFieldType';
    const block = () => estimateCapacityFn(ctx, new JsExpression(() => `${r}${accessor}`), field.value);
    if (isOptional) {
      codegen.if(`${r}${accessor} !== undefined`, block);
    } else block();
  }
};

export const map = (ctx: CapacityEstimatorCodegenContext, value: JsExpression, type: Type): void => {
  const codegen = ctx.codegen;
  ctx.inc(MaxEncodingOverhead.Object);
  const r = codegen.var(value.use());
  const rKeys = codegen.var(`Object.keys(${r})`);
  const rKey = codegen.var();
  const rLen = codegen.var(`${rKeys}.length`);
  codegen.js(`size += ${MaxEncodingOverhead.ObjectElement} * ${rLen}`);
  const mapType = type as any; // MapType
  const valueType = mapType.valueType;
  const fn = valueType.compileCapacityEstimator({
    system: ctx.options.system,
    name: ctx.options.name,
  });
  const rFn = codegen.linkDependency(fn);
  const ri = codegen.var('0');
  codegen.js(`for (; ${ri} < ${rLen}; ${ri}++) {`);
  codegen.js(`${rKey} = ${rKeys}[${ri}];`);
  codegen.js(`size += maxEncodingCapacity(${rKey}) + ${rFn}(${r}[${rKey}]);`);
  codegen.js(`}`);
};

export const ref = (ctx: CapacityEstimatorCodegenContext, value: JsExpression, type: Type): void => {
  const refType = type as any; // RefType
  const system = ctx.options.system || refType.system;
  if (!system) throw new Error('NO_SYSTEM');
  const estimator = system.resolve(refType.schema.ref).type.capacityEstimator();
  const d = ctx.codegen.linkDependency(estimator);
  ctx.codegen.js(`size += ${d}(${value.use()});`);
};

export const or = (
  ctx: CapacityEstimatorCodegenContext,
  value: JsExpression,
  type: Type,
  estimateCapacityFn: EstimatorFunction,
): void => {
  const codegen = ctx.codegen;
  const orType = type as any; // OrType
  const discriminator = orType.discriminator();
  const d = codegen.linkDependency(discriminator);
  const types = orType.types;
  codegen.switch(
    `${d}(${value.use()})`,
    types.map((childType: Type, index: number) => [
      index,
      () => {
        estimateCapacityFn(ctx, value, childType);
      },
    ]),
  );
};

/**
 * Main router function that dispatches capacity estimation to the appropriate
 * estimator function based on the type's kind.
 */
export const generate = (ctx: CapacityEstimatorCodegenContext, value: JsExpression, type: Type): void => {
  const kind = type.getTypeName();

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
      str(ctx, value);
      break;
    case 'bin':
      bin(ctx, value);
      break;
    case 'con':
      const_(ctx, value, type);
      break;
    case 'arr':
      arr(ctx, value, type);
      break;
    case 'tup':
      tup(ctx, value, type);
      break;
    case 'obj':
      obj(ctx, value, type, generate);
      break;
    case 'map':
      map(ctx, value, type);
      break;
    case 'ref':
      ref(ctx, value, type);
      break;
    case 'or':
      or(ctx, value, type, generate);
      break;
    default:
      throw new Error(`${kind} type capacity estimation not implemented`);
  }
};

/**
 * Standalone function to generate a capacity estimator for a given type.
 */
export const codegen = (
  type: Type,
  options: Omit<CapacityEstimatorCodegenContextOptions, 'type'>,
): CompiledCapacityEstimator => {
  const ctx = new CapacityEstimatorCodegenContext({
    system: type.system,
    ...options,
    type: type as any,
  });
  const r = ctx.codegen.options.args[0];
  const value = new JsExpression(() => r);
  // Use the centralized router instead of the abstract method
  generate(ctx, value, type);
  return ctx.compile();
};
