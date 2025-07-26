import type * as jtd from './types';
import type {AbstractType} from '../type/classes/AbstractType';
import type {AnyType} from '../type/classes/AnyType';
import type {BooleanType} from '../type/classes/BooleanType';
import type {ConstType} from '../type/classes/ConstType';
import type {NumberType} from '../type/classes/NumberType';
import type {StringType} from '../type/classes/StringType';
import type {ArrayType} from '../type/classes/ArrayType';
import type {ObjectType} from '../type/classes/ObjectType';
import type {TupleType} from '../type/classes/TupleType';
import type {MapType} from '../type/classes/MapType';
import type {RefType} from '../type/classes/RefType';
import type {OrType} from '../type/classes/OrType';
import type {BinaryType} from '../type/classes/BinaryType';
import type {FunctionType, FunctionStreamingType} from '../type/classes/FunctionType';

/**
 * Default/fallback JTD form converter for AbstractType.
 */
export function convertAbstractType(type: AbstractType<any>): jtd.JtdForm {
  const form: jtd.JtdEmptyForm = {nullable: false};
  return form;
}

/**
 * JTD form converter for AnyType.
 */
export function convertAnyType(type: AnyType): jtd.JtdEmptyForm {
  const form: jtd.JtdEmptyForm = {nullable: true};
  return form;
}

/**
 * JTD form converter for BooleanType.
 */
export function convertBooleanType(type: BooleanType): jtd.JtdTypeForm {
  const form: jtd.JtdTypeForm = {type: 'boolean'};
  return form;
}

/**
 * JTD form converter for ConstType.
 */
export function convertConstType(type: ConstType): jtd.JtdForm {
  const value = type.value();
  const valueType = typeof value;
  switch (valueType) {
    case 'boolean':
    case 'string':
      return {type: valueType};
    case 'number': {
      if (value !== Math.round(value)) return {type: 'float64'};
      if (value >= 0) {
        if (value <= 255) return {type: 'uint8'};
        if (value <= 65535) return {type: 'uint16'};
        if (value <= 4294967295) return {type: 'uint32'};
      } else {
        if (value >= -128) return {type: 'int8'};
        if (value >= -32768) return {type: 'int16'};
        if (value >= -2147483648) return {type: 'int32'};
      }
      return {type: 'float64'};
    }
  }
  return convertAbstractType(type);
}

/**
 * JTD form converter for NumberType.
 */
export function convertNumberType(type: NumberType): jtd.JtdTypeForm {
  const schema = type.getSchema();
  switch (schema.format) {
    case 'u8':
      return {type: 'uint8'};
    case 'u16':
      return {type: 'uint16'};
    case 'u32':
      return {type: 'uint32'};
    case 'i8':
      return {type: 'int8'};
    case 'i16':
      return {type: 'int16'};
    case 'i32':
      return {type: 'int32'};
    case 'f32':
      return {type: 'float32'};
    default:
      return {type: 'float64'};
  }
}

/**
 * JTD form converter for StringType.
 */
export function convertStringType(type: StringType): jtd.JtdTypeForm {
  return {type: 'string'};
}

/**
 * JTD form converter for ArrayType.
 */
export function convertArrayType(type: ArrayType<any>): jtd.JtdElementsForm {
  const elementType = (type as any).type;
  return {
    elements: [toJtdForm(elementType)]
  };
}

/**
 * JTD form converter for ObjectType.
 */
export function convertObjectType(type: ObjectType): jtd.JtdPropertiesForm {
  const fields = (type as any).fields;
  const form: jtd.JtdPropertiesForm = {};
  
  if (fields && fields.length > 0) {
    form.properties = {};
    form.optionalProperties = {};
    
    for (const field of fields) {
      const fieldName = field.key;
      const fieldType = field.value;
      
      if (fieldType) {
        const fieldJtd = toJtdForm(fieldType);
        // Check if field is optional using instanceof check since optional is a property
        if ((field as any).optional === true) {
          form.optionalProperties[fieldName] = fieldJtd;
        } else {
          form.properties[fieldName] = fieldJtd;
        }
      }
    }
  }
  
  // Handle additional properties - check the schema for unknownFields
  const schema = type.getSchema();
  if (schema.unknownFields === false) {
    form.additionalProperties = false;
  }
  
  return form;
}

/**
 * JTD form converter for TupleType.
 */
export function convertTupleType(type: TupleType<any>): jtd.JtdElementsForm {
  const elements = (type as any).types;
  return {
    elements: elements.map((element: any) => toJtdForm(element))
  };
}

/**
 * JTD form converter for MapType.
 */
export function convertMapType(type: MapType<any>): jtd.JtdValuesForm {
  const valueType = (type as any).type;
  return {
    values: toJtdForm(valueType)
  };
}

/**
 * JTD form converter for RefType.
 */
export function convertRefType(type: RefType<any>): jtd.JtdRefForm {
  const ref = type.getRef();
  return {
    ref: ref
  };
}

/**
 * JTD form converter for OrType.
 */
export function convertOrType(type: OrType<any>): jtd.JtdForm {
  // OrType is complex - for simplicity, convert to empty form
  // In a full implementation, this might need to be a discriminator form
  return convertAbstractType(type);
}

/**
 * JTD form converter for BinaryType.
 */
export function convertBinaryType(type: BinaryType<any>): jtd.JtdForm {
  // Binary types don't have a direct JTD equivalent, fall back to default
  return convertAbstractType(type);
}

/**
 * JTD form converter for FunctionType.
 */
export function convertFunctionType(type: FunctionType<any, any>): jtd.JtdForm {
  // Function types don't have a direct JTD equivalent, fall back to default
  return convertAbstractType(type);
}

/**
 * JTD form converter for FunctionStreamingType.
 */
export function convertFunctionStreamingType(type: FunctionStreamingType<any, any>): jtd.JtdForm {
  // Streaming function types don't have a direct JTD equivalent, fall back to default
  return convertAbstractType(type);
}

/**
 * Main router function that converts any AbstractType to JTD form.
 * Uses a switch statement to route to the appropriate converter function.
 */
export function toJtdForm(type: AbstractType<any>): jtd.JtdForm {
  const typeName = type.getTypeName();
  
  switch (typeName) {
    case 'any':
      return convertAnyType(type as AnyType);
    case 'bool':
      return convertBooleanType(type as BooleanType);
    case 'const':
      return convertConstType(type as ConstType);
    case 'num':
      return convertNumberType(type as NumberType);
    case 'str':
      return convertStringType(type as StringType);
    case 'arr':
      return convertArrayType(type as ArrayType<any>);
    case 'obj':
      return convertObjectType(type as ObjectType);
    case 'tuple':
      return convertTupleType(type as TupleType<any>);
    case 'map':
      return convertMapType(type as MapType<any>);
    case 'ref':
      return convertRefType(type as RefType<any>);
    case 'or':
      return convertOrType(type as OrType<any>);
    case 'bin':
      return convertBinaryType(type as BinaryType<any>);
    case 'fn':
      return convertFunctionType(type as FunctionType<any, any>);
    case 'fn-stream':
      return convertFunctionStreamingType(type as FunctionStreamingType<any, any>);
    default:
      return convertAbstractType(type);
  }
}