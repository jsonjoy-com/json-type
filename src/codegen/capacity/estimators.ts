import {JsExpression} from '@jsonjoy.com/util/lib/codegen/util/JsExpression';
import {MaxEncodingOverhead, maxEncodingCapacity} from '@jsonjoy.com/util/lib/json-size';
import type {CapacityEstimatorCodegenContext} from './CapacityEstimatorCodegenContext';
import type {Type} from '../../type';
import {ConstType} from '../../type/classes/ConstType';
import {BooleanType} from '../../type/classes/BooleanType';
import {NumberType} from '../../type/classes/NumberType';

type EstimatorFunction = (ctx: CapacityEstimatorCodegenContext, value: JsExpression, type: Type) => void;

function normalizeAccessor(key: string): string {
  // Simple property access for valid identifiers, bracket notation otherwise
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
    return `.${key}`;
  }
  return `[${JSON.stringify(key)}]`;
}

export function estimateAnyCapacity(ctx: CapacityEstimatorCodegenContext, value: JsExpression, type: Type): void {
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
}

export function estimateBooleanCapacity(ctx: CapacityEstimatorCodegenContext, value: JsExpression): void {
  ctx.inc(MaxEncodingOverhead.Boolean);
}

export function estimateNumberCapacity(ctx: CapacityEstimatorCodegenContext, value: JsExpression): void {
  ctx.inc(MaxEncodingOverhead.Number);
}

export function estimateStringCapacity(ctx: CapacityEstimatorCodegenContext, value: JsExpression): void {
  ctx.inc(MaxEncodingOverhead.String);
  ctx.codegen.js(`size += ${MaxEncodingOverhead.StringLengthMultiplier} * ${value.use()}.length;`);
}

export function estimateBinaryCapacity(ctx: CapacityEstimatorCodegenContext, value: JsExpression): void {
  ctx.inc(MaxEncodingOverhead.Binary);
  ctx.codegen.js(`size += ${MaxEncodingOverhead.BinaryLengthMultiplier} * ${value.use()}.length;`);
}

export function estimateConstCapacity(ctx: CapacityEstimatorCodegenContext, value: JsExpression, type: Type): void {
  const constType = type as any; // ConstType
  ctx.inc(maxEncodingCapacity(constType.value()));
}

export function estimateArrayCapacity(ctx: CapacityEstimatorCodegenContext, value: JsExpression, type: Type): void {
  const codegen = ctx.codegen;
  ctx.inc(MaxEncodingOverhead.Array);
  const rLen = codegen.var(`${value.use()}.length`);
  const arrayType = type as any; // ArrayType
  const elementType = arrayType.type;
  codegen.js(`size += ${MaxEncodingOverhead.ArrayElement} * ${rLen}`);
  const fn = elementType.compileCapacityEstimator({
    system: ctx.options.system,
    name: ctx.options.name,
  });
  const isConstantSizeType = elementType instanceof ConstType || elementType instanceof BooleanType || elementType instanceof NumberType;
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
}

export function estimateTupleCapacity(ctx: CapacityEstimatorCodegenContext, value: JsExpression, type: Type): void {
  const codegen = ctx.codegen;
  const r = codegen.var(value.use());
  const tupleType = type as any; // TupleType
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
}

export function estimateObjectCapacity(ctx: CapacityEstimatorCodegenContext, value: JsExpression, type: Type, estimateCapacityFn: EstimatorFunction): void {
  const codegen = ctx.codegen;
  const r = codegen.var(value.use());
  const objectType = type as any; // ObjectType
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
    const isOptional = field.optional || (field.constructor?.name === 'ObjectOptionalFieldType');
    const block = () => estimateCapacityFn(ctx, new JsExpression(() => `${r}${accessor}`), field.value);
    if (isOptional) {
      codegen.if(`${r}${accessor} !== undefined`, block);
    } else block();
  }
}

export function estimateMapCapacity(ctx: CapacityEstimatorCodegenContext, value: JsExpression, type: Type): void {
  const codegen = ctx.codegen;
  ctx.inc(MaxEncodingOverhead.Object);
  const r = codegen.var(value.use());
  const rKeys = codegen.var(`Object.keys(${r})`);
  const rKey = codegen.var();
  const rLen = codegen.var(`${rKeys}.length`);
  codegen.js(`size += ${MaxEncodingOverhead.ObjectElement} * ${rLen}`);
  const mapType = type as any; // MapType
  const valueType = mapType.type;
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
}

export function estimateRefCapacity(ctx: CapacityEstimatorCodegenContext, value: JsExpression, type: Type): void {
  const refType = type as any; // RefType
  const system = ctx.options.system || refType.system;
  if (!system) throw new Error('NO_SYSTEM');
  const estimator = system.resolve(refType.schema.ref).type.capacityEstimator();
  const d = ctx.codegen.linkDependency(estimator);
  ctx.codegen.js(`size += ${d}(${value.use()});`);
}

export function estimateOrCapacity(ctx: CapacityEstimatorCodegenContext, value: JsExpression, type: Type, estimateCapacityFn: EstimatorFunction): void {
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
}