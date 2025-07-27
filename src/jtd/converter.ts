import type * as jtd from './types';
import type * as schema from '../schema';

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
      switch (numSchema.format) {
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
    case 'or': {
      // OrType is complex - for simplicity, convert to empty form
      // In a full implementation, this might need to be a discriminator form
      const form: jtd.JtdEmptyForm = {nullable: false};
      return form;
    }
    case 'bin': {
      // Binary types don't have a direct JTD equivalent, fall back to default
      const form: jtd.JtdEmptyForm = {nullable: false};
      return form;
    }
    case 'fn': {
      // Function types don't have a direct JTD equivalent, fall back to default
      const form: jtd.JtdEmptyForm = {nullable: false};
      return form;
    }
    case 'fn$': {
      // Streaming function types don't have a direct JTD equivalent, fall back to default
      const form: jtd.JtdEmptyForm = {nullable: false};
      return form;
    }
    default: {
      const form: jtd.JtdEmptyForm = {nullable: false};
      return form;
    }
  }
}
