/**
 * Fixture schemas for testing random value generation.
 * These schemas represent different JSON Type configurations that can be used
 * across multiple test modules.
 */

import {s} from '../schema';
import {t} from '../type';
import {genRandomExample} from '@jsonjoy.com/json-random/lib/examples';
import {RandomJson} from '@jsonjoy.com/json-random';

export const randomJson = () => {
  return Math.random() < .5 ? genRandomExample() : RandomJson.generate();
};

/**
 * Basic primitive type schemas
 */
export const primitiveSchemas = {
  string: s.String(),
  stringWithMinMax: s.String({min: 5, max: 10}),
  number: s.Number(),
  numberWithFormat: s.Number({format: 'u32'}),
  numberWithRange: s.Number({gte: 0, lte: 100}),
  boolean: s.Boolean(),
  const: s.Const('fixed-value' as const),
  any: s.Any(),
} as const;

/**
 * Complex composite type schemas
 */
export const compositeSchemas = {
  simpleArray: s.Array(s.String()),
  arrayWithBounds: s.Array(s.Number(), {min: 2, max: 5}),
  simpleObject: s.Object([s.prop('id', s.String()), s.prop('name', s.String()), s.prop('active', s.Boolean())]),
  objectWithOptionalFields: s.Object([
    s.prop('id', s.String()),
    s.propOpt('name', s.String()),
    s.propOpt('count', s.Number()),
  ]),
  nestedObject: s.Object([
    s.prop(
      'user',
      s.Object([
        s.prop('id', s.Number()),
        s.prop('profile', s.Object([s.prop('name', s.String()), s.prop('email', s.String())])),
      ]),
    ),
    s.prop('tags', s.Array(s.String())),
  ]),
  tuple: s.Tuple([s.String(), s.Number(), s.Boolean()]),
  map: s.Map(s.String()),
  mapWithComplexValue: s.Map(s.Object([s.prop('value', s.Number()), s.prop('label', s.String())])),
  union: s.Or(s.String(), s.Number(), s.Boolean()),
  complexUnion: s.Or(
    s.String(),
    s.Object([s.prop('type', s.Const('object' as const)), s.prop('data', s.Any())]),
    s.Array(s.Number()),
  ),
  binary: s.bin,
} as const;

/**
 * All fixture schemas combined for comprehensive testing
 */
export const allSchemas = {
  ...primitiveSchemas,
  ...compositeSchemas,
} as const;

/**
 * Schema categories for organized testing
 */
export const schemaCategories = {
  primitives: primitiveSchemas,
  composites: compositeSchemas,
  all: allSchemas,
} as const;

/**
 * User profile schema with nested objects and optional fields
 */
export const User = t
  .object({
    id: t.str,
    name: t.object({
      first: t.str,
      last: t.str,
    }),
    email: t.String({format: 'ascii'}),
    age: t.Number({gte: 0, lte: 150}),
    verified: t.bool,
  })
  .opt('avatar', t.String({format: 'ascii'}));

/**
 * Product catalog schema with arrays and formatted numbers
 */
export const Product = t.Object(
  t.prop('id', t.String({format: 'ascii'})),
  t.prop('name', t.String({min: 1, max: 100})),
  t.prop('price', t.Number({format: 'f64', gte: 0})),
  t.prop('inStock', t.bool),
  t.prop('categories', t.Array(t.str, {min: 1})),
  t.prop('tags', t.Array(t.str)),
  t.propOpt('description', t.String({max: 1000})),
  t.propOpt('discount', t.Number({gte: 0, lte: 1})),
);

/**
 * Blog post schema with timestamps and rich content
 */
export const BlogPost = t.Object(
  t.prop('id', t.str),
  t.prop('title', t.String({min: 1, max: 200})),
  t.prop('content', t.str),
  t.prop('author', t.Ref<typeof User>('User')),
  t.prop('publishedAt', t.Number({format: 'u64'})),
  t.prop('status', t.enum('draft', 'published', 'archived')),
  t.propOpt('updatedAt', t.Number({format: 'u64'})),
  t.propOpt('tags', t.Array(t.str)),
);

/**
 * API response schema with discriminated unions
 */
export const ApiResponse = t.Or(
  t.object({
    success: t.Const(true),
    data: t.any,
    timestamp: t.Number({format: 'u64'}),
  }),
  t.object({
    success: t.Const(false),
    error: t.object({
      code: t.String({format: 'ascii'}),
      message: t.str,
    }),
    timestamp: t.Number({format: 'u64'}),
  }),
);

/**
 * File metadata schema with binary data
 */
export const FileMetadata = t.Object(
  t.prop('name', t.str),
  t.prop('size', t.Number({format: 'u64', gte: 0})),
  t.prop('mimeType', t.str),
  t.prop('data', t.Binary(t.any)),
  t.prop('checksum', t.String({format: 'ascii', min: 64, max: 64})),
  t.prop('uploadedAt', t.Number({format: 'u64'})),
  t.propOpt('metadata', t.Map(t.str)),
);

/**
 * Configuration schema with maps and default values
 */
export const Configuration = t.Object(
  t.prop('environment', t.enum('development', 'staging', 'production')),
  t.prop(
    'database',
    t.object({
      host: t.str,
      port: t.Number({format: 'u16', gte: 1, lte: 65535}),
      name: t.str,
    }),
  ),
  t.prop('features', t.Map(t.bool)),
  t.prop('secrets', t.Map(t.str)),
  t.propOpt(
    'logging',
    t.object({
      level: t.enum('debug', 'info', 'warn', 'error'),
      output: t.str,
    }),
  ),
);

/**
 * Event data schema with tuples and coordinates
 */
export const Event = t.Object(
  t.prop('id', t.String({format: 'ascii'})),
  t.prop('type', t.enum('click', 'view', 'purchase', 'signup')),
  t.prop('timestamp', t.Number({format: 'u64'})),
  t.prop('userId', t.maybe(t.str)),
  t.prop('location', t.Tuple([t.Number({format: 'f64'}), t.Number({format: 'f64'})])),
  t.prop('metadata', t.Map(t.Or(t.str, t.num, t.bool))),
  t.propOpt('sessionId', t.str),
);

/**
 * Contact information schema with formatted strings
 */
export const ContactInfo = t.Object(
  t.prop(
    'name',
    t.object({
      first: t.String({min: 1}),
      last: t.String({min: 1}),
    }),
  ),
  t.prop('emails', t.Array(t.String({format: 'ascii'}), {min: 1})),
  t.prop('phones', t.Array(t.tuple(t.enum('home', 'work', 'mobile'), t.str))),
  t.propOpt(
    'address',
    t.object({
      street: t.str,
      city: t.str,
      country: t.String({format: 'ascii', min: 2, max: 2}),
      postalCode: t.str,
    }),
  ),
  t.propOpt('socialMedia', t.Map(t.String({format: 'ascii'}))),
);

/**
 * Database record schema with references
 */
export const DatabaseRecord = t.Object(
  t.prop('id', t.String({format: 'ascii'})),
  t.prop('createdAt', t.Number({format: 'u64'})),
  t.prop('updatedAt', t.Number({format: 'u64'})),
  t.prop('version', t.Number({format: 'u32', gte: 1})),
  t.prop('createdBy', t.Ref<typeof User>('User')),
  t.propOpt('updatedBy', t.Ref<typeof User>('User')),
  t.propOpt('deletedAt', t.Number({format: 'u64'})),
);

/**
 * Function type schema
 */
export const UserValidator = t.Function(
  t.object({
    userData: t.any,
    strict: t.bool,
  }),
  t.object({
    valid: t.bool,
    errors: t.Array(t.str),
  }),
  {title: 'User Validation Function'},
);

/**
 * Streaming API schema
 */
export const EventStream = t.Function$(
  t.object({
    filter: t.maybe(t.str),
    limit: t.maybe(t.Number({format: 'u32'})),
  }),
  t.Ref<typeof Event>('Event'),
  {title: 'Event Streaming Function'},
);

/**
 * Complex nested schema
 */
export const ComplexNested = t.Object(
  t.prop(
    'data',
    t.Map(
      t.Or(
        t.str,
        t.num,
        t.Array(
          t.Map(
            t.object({
              key: t.str,
              value: t.Or(t.str, t.num, t.bool, t.nil),
              nested: t.maybe(t.Map(t.any)),
            }),
          ),
        ),
      ),
    ),
  ),
  t.prop(
    'metadata',
    t.object({
      version: t.str,
      schema: t.String({format: 'ascii'}),
      checksum: t.String({format: 'ascii'}),
    }),
  ),
);
