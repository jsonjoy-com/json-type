import {ConSchema, ModuleSchema, ObjSchema} from "../schema";
import {value} from "../value";

export const module: ModuleSchema = {
  kind: 'module',
  keys: [
    {kind: 'key', key: 'Display', value: {
      kind: 'obj',
      title: 'Display options for JSON Type',
      description: 'These options are used to display the type in documentation or code generation.',
      keys: [
        {kind: 'key', key: 'title', optional: true, value: {kind: 'str'}},
        {kind: 'key', key: 'intro', optional: true, value: {kind: 'str'}},
        {kind: 'key', key: 'description', optional: true, value: {kind: 'str'}},
      ],
    } as ObjSchema},
    {kind: 'key', key: 'SchemaBase',
      value: {
        kind: 'obj',
        extends: ['Display'],
        keys: [
          {kind: 'key', key: 'metadata', optional: true, value: {kind: 'map'}},
        ],
      } as ObjSchema
    },
    {kind: 'key', key: 'AnySchema',
      value: {
        kind: 'obj',
        extends: ['SchemaBase'],
        keys: [
          {kind: 'key', key: 'kind', value: {kind: 'con', value: 'any'} as ConSchema<'any'>},
        ],
      } as ObjSchema,
    },
    {kind: 'key', key: 'ConSchema',
      value: {
        kind: 'obj',
        extends: ['SchemaBase'],
        keys: [
          {kind: 'key', key: 'kind', value: {kind: 'con', value: 'con'} as ConSchema<'con'>},
          {kind: 'key', key: 'value', value: {kind: 'any'}},
        ],
      } as ObjSchema,
    },
  ],
};