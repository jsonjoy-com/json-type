/**
 * Fixture schemas for testing random value generation.
 * These schemas represent different JSON Type configurations that can be used
 * across multiple test modules.
 */

import {s} from '../schema';

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
