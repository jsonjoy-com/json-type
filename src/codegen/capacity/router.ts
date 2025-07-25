import {JsExpression} from '@jsonjoy.com/util/lib/codegen/util/JsExpression';
import type {CapacityEstimatorCodegenContext} from './CapacityEstimatorCodegenContext';
import type {Type} from '../../type';
import {
  estimateAnyCapacity,
  estimateBooleanCapacity,
  estimateNumberCapacity,
  estimateStringCapacity,
  estimateBinaryCapacity,
  estimateConstCapacity,
  estimateArrayCapacity,
  estimateTupleCapacity,
  estimateObjectCapacity,
  estimateMapCapacity,
  estimateRefCapacity,
  estimateOrCapacity,
} from './estimators';

/**
 * Main router function that dispatches capacity estimation to the appropriate
 * estimator function based on the type's kind.
 */
export function estimateCapacity(ctx: CapacityEstimatorCodegenContext, value: JsExpression, type: Type): void {
  const kind = type.getTypeName();
  
  switch (kind) {
    case 'any':
      estimateAnyCapacity(ctx, value, type);
      break;
    case 'bool':
      estimateBooleanCapacity(ctx, value);
      break;
    case 'num':
      estimateNumberCapacity(ctx, value);
      break;
    case 'str':
      estimateStringCapacity(ctx, value);
      break;
    case 'bin':
      estimateBinaryCapacity(ctx, value);
      break;
    case 'const':
      estimateConstCapacity(ctx, value, type);
      break;
    case 'arr':
      estimateArrayCapacity(ctx, value, type);
      break;
    case 'tup':
      estimateTupleCapacity(ctx, value, type);
      break;
    case 'obj':
      estimateObjectCapacity(ctx, value, type, estimateCapacity);
      break;
    case 'map':
      estimateMapCapacity(ctx, value, type);
      break;
    case 'ref':
      estimateRefCapacity(ctx, value, type);
      break;
    case 'or':
      estimateOrCapacity(ctx, value, type, estimateCapacity);
      break;
    default:
      throw new Error(`${kind} type capacity estimation not implemented`);
  }
}