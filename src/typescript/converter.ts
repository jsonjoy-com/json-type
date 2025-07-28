import type * as ts from './types';
import type * as schema from '../schema';

/**
 * Main router function that converts any Schema to TypeScript AST.
 * Uses a switch statement to route to the appropriate converter logic.
 */
export function toTypeScriptAst(schema: schema.Schema): ts.TsType {
  const typeName = schema.kind;

  switch (typeName) {
    case 'any': {
      const node: ts.TsAnyKeyword = {node: 'AnyKeyword'};
      return node;
    }
    case 'bool': {
      const node: ts.TsBooleanKeyword = {node: 'BooleanKeyword'};
      return node;
    }
    case 'con': {
      const constSchema = schema as schema.ConstSchema;
      const value = constSchema.value;
      const valueType = typeof value;
      switch (valueType) {
        case 'boolean': {
          if (value === true) {
            const node: ts.TsTrueKeyword = {node: 'TrueKeyword'};
            return node;
          } else {
            const node: ts.TsFalseKeyword = {node: 'FalseKeyword'};
            return node;
          }
        }
        case 'string': {
          const node: ts.TsStringLiteral = {
            node: 'StringLiteral',
            text: value as string,
          };
          return node;
        }
        case 'number': {
          const node: ts.TsNumericLiteral = {
            node: 'NumericLiteral',
            text: String(value),
          };
          return node;
        }
        case 'object': {
          if (value === null) {
            const node: ts.TsNullKeyword = {node: 'NullKeyword'};
            return node;
          }
          // For complex objects, fallback to object keyword
          const node: ts.TsObjectKeyword = {node: 'ObjectKeyword'};
          return node;
        }
      }
      // Fallback for other value types
      const node: ts.TsObjectKeyword = {node: 'ObjectKeyword'};
      return node;
    }
    case 'num': {
      const node: ts.TsNumberKeyword = {node: 'NumberKeyword'};
      return node;
    }
    case 'str': {
      const node: ts.TsStringKeyword = {node: 'StringKeyword'};
      return node;
    }
    case 'bin': {
      const node: ts.TsGenericTypeAnnotation = {
        node: 'GenericTypeAnnotation',
        id: {
          node: 'Identifier',
          name: 'Uint8Array',
        },
      };
      return node;
    }
    case 'arr': {
      const arraySchema = schema as schema.ArraySchema;
      const node: ts.TsArrType = {
        node: 'ArrType',
        elementType: toTypeScriptAst(arraySchema.type) as ts.TsType,
      };
      return node;
    }
    case 'tup': {
      const tupleSchema = schema as schema.TupleSchema;
      const node: ts.TsTupType = {
        node: 'TupType',
        elements: tupleSchema.types.map((type: any) => toTypeScriptAst(type) as ts.TsType),
      };
      return node;
    }
    case 'obj': {
      const objSchema = schema as schema.ObjectSchema;
      const node: ts.TsTypeLiteral = {
        node: 'TypeLiteral',
        members: [],
      };

      // Handle fields
      if (objSchema.fields && objSchema.fields.length > 0) {
        for (const field of objSchema.fields) {
          const member: ts.TsPropertySignature = {
            node: 'PropertySignature',
            name: field.key,
            type: toTypeScriptAst(field.value) as ts.TsType,
          };
          if (field.optional === true) {
            member.optional = true;
          }
          // Add comment using the same logic as the original augmentWithComment
          if (field.title || field.description) {
            let comment = '';
            if (field.title) comment += '# ' + field.title;
            if (field.title && field.description) comment += '\n\n';
            if (field.description) comment += field.description;
            member.comment = comment;
          }
          node.members.push(member);
        }
      }

      // Handle unknown/additional fields
      if (objSchema.unknownFields || (objSchema as any).encodeUnknownFields) {
        node.members.push({
          node: 'IndexSignature',
          type: {node: 'UnknownKeyword'},
        });
      }

      // Add comment to the type literal itself using the same logic as augmentWithComment
      if (objSchema.title || objSchema.description) {
        let comment = '';
        if (objSchema.title) comment += '# ' + objSchema.title;
        if (objSchema.title && objSchema.description) comment += '\n\n';
        if (objSchema.description) comment += objSchema.description;
        node.comment = comment;
      }

      return node;
    }
    case 'map': {
      const mapSchema = schema as schema.MapSchema;
      const node: ts.TsTypeReference = {
        node: 'TypeReference',
        typeName: 'Record',
        typeArguments: [{node: 'StringKeyword'}, toTypeScriptAst(mapSchema.value)],
      };
      return node;
    }
    case 'or': {
      const orSchema = schema as schema.OrSchema;
      const node: ts.TsUnionType = {
        node: 'UnionType',
        types: orSchema.types.map((type: any) => toTypeScriptAst(type)),
      };
      return node;
    }
    case 'ref': {
      const refSchema = schema as schema.RefSchema;
      const node: ts.TsGenericTypeAnnotation = {
        node: 'GenericTypeAnnotation',
        id: {
          node: 'Identifier',
          name: refSchema.ref,
        },
      };
      return node;
    }
    case 'fn': {
      const fnSchema = schema as schema.FunctionSchema;
      // Extract schemas from the type instances
      const reqSchema = (fnSchema.req as any).getSchema ? (fnSchema.req as any).getSchema() : fnSchema.req;
      const resSchema = (fnSchema.res as any).getSchema ? (fnSchema.res as any).getSchema() : fnSchema.res;

      const node: ts.TsFnType = {
        node: 'FnType',
        parameters: [
          {
            node: 'Parameter',
            name: {
              node: 'Identifier',
              name: 'request',
            },
            type: toTypeScriptAst(reqSchema),
          },
        ],
        type: {
          node: 'TypeReference',
          typeName: {
            node: 'Identifier',
            name: 'Promise',
          },
          typeArguments: [toTypeScriptAst(resSchema)],
        },
      };
      return node;
    }
    case 'fn$': {
      const fnSchema = schema as schema.FunctionStreamingSchema;
      // Extract schemas from the type instances
      const reqSchema = (fnSchema.req as any).getSchema ? (fnSchema.req as any).getSchema() : fnSchema.req;
      const resSchema = (fnSchema.res as any).getSchema ? (fnSchema.res as any).getSchema() : fnSchema.res;

      const node: ts.TsFnType = {
        node: 'FnType',
        parameters: [
          {
            node: 'Parameter',
            name: {
              node: 'Identifier',
              name: 'request$',
            },
            type: {
              node: 'TypeReference',
              typeName: {
                node: 'Identifier',
                name: 'Observable',
              },
              typeArguments: [toTypeScriptAst(reqSchema)],
            },
          },
        ],
        type: {
          node: 'TypeReference',
          typeName: {
            node: 'Identifier',
            name: 'Observable',
          },
          typeArguments: [toTypeScriptAst(resSchema)],
        },
      };
      return node;
    }
    default: {
      // Fallback for unknown types
      const node: ts.TsUnknownKeyword = {node: 'UnknownKeyword'};
      return node;
    }
  }
}
