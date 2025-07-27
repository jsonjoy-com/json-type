import type * as jtd from './types';
import type * as schema from '../schema';

const NUMS_TYPE_MAPPING = new Map<string, jtd.JtdType>([
  ['u8', 'uint8'],
  ['u16', 'uint16'],
  ['u32', 'uint32'],
  ['i8', 'int8'],
  ['i16', 'int16'],
  ['i32', 'int32'],
  ['f32', 'float32'],
]);

/**
 * Main router function that converts any Schema to JTD form.
 * Uses a switch statement to route to the appropriate converter logic.
 */
export function toJtdForm(schema: schema.Schema): jtd.JtdForm {
  const typeName = schema.kind;

  switch (typeName) {
    case 'any': {
      const form: jtd.JtdEmptyForm = {nullable: true};
      return form;
    }
    case 'bool': {
      const form: jtd.JtdTypeForm = {type: 'boolean'};
      return form;
    }
    case 'const': {
      const constSchema = schema as schema.ConstSchema;
      const value = constSchema.value;
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
      const form: jtd.JtdEmptyForm = {nullable: false};
      return form;
    }
    case 'num': {
      const numSchema = schema as schema.NumberSchema;
      return {
        type: (NUMS_TYPE_MAPPING.get(numSchema.format || '') ?? 'float64') as jtd.JtdType,
      };
    }
    case 'str': {
      return {type: 'string'};
    }
    case 'arr': {
      const arraySchema = schema as schema.ArraySchema;
      return {
        elements: [toJtdForm(arraySchema.type)],
      };
    }
    case 'obj': {
      const objSchema = schema as schema.ObjectSchema;
      const form: jtd.JtdPropertiesForm = {};

      if (objSchema.fields && objSchema.fields.length > 0) {
        form.properties = {};
        form.optionalProperties = {};

        for (const field of objSchema.fields) {
          const fieldName = field.key;
          const fieldType = field.type;

          if (fieldType) {
            const fieldJtd = toJtdForm(fieldType);
            // Check if field is optional
            if (field.optional === true) {
              form.optionalProperties[fieldName] = fieldJtd;
            } else {
              form.properties[fieldName] = fieldJtd;
            }
          }
        }
      }

      // Handle additional properties - check the schema for unknownFields
      if (objSchema.unknownFields === false) {
        form.additionalProperties = false;
      }

      return form;
    }
    case 'tup': {
      const tupleSchema = schema as schema.TupleSchema;
      return {
        elements: tupleSchema.types.map((element: any) => toJtdForm(element)),
      };
    }
    case 'map': {
      const mapSchema = schema as schema.MapSchema;
      return {
        values: toJtdForm(mapSchema.type),
      };
    }
    case 'ref': {
      const refSchema = schema as schema.RefSchema;
      return {
        ref: refSchema.ref,
      };
    }
    // case 'or':
    // case 'bin':
    // case 'fn':
    // case 'fn$':
    default: {
      const form: jtd.JtdEmptyForm = {nullable: false};
      return form;
    }
  }
}
