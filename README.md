# JSON Type

Modern type system for JSON. JSON Type is way a new way to specify JSON schema,
it is an alternative and improvement over JSON Schema and JSON Type Definition.

Features of the library:

- JIT compilation for schema validator.
- JIT compilation for JSON (text) serializer.
- JIT compilation for CBOR, MessagePack, and JSON (binary) serializers.
- JIT compilation for safe serialization size estimation.
- Schema export and import.
- Const types.
- Union type discriminator is specified using the [JSON Expression](https://jsonjoy.com/specs/json-expression) language.
- Some discriminators are automatically inferred, when const types are used.
- Custom validation rules can be added using the JSON Expression language.
- Can generate random JSON values that match the schema.


## Usage

Type builder for JSON-like data structures:

```ts
import {t} from '@jsonjoy.com/json-type';

t.String(); // { kind: 'str' }
t.String({const: 'add'}); // { kind: 'str', const: 'add' }

const type = t.Object([
  t.Field(
    'collection',
    t.Object([
      t.Field('id', t.String({format: 'ascii', noJsonEscape: true})),
      t.Field('ts', t.num, {format: 'u64'}),
      t.Field('cid', t.String({format: 'ascii', noJsonEscape: true})),
      t.Field('prid', t.String({format: 'ascii', noJsonEscape: true})),
      t.Field('slug', t.String({format: 'ascii', noJsonEscape: true})),
      t.Field('name', t.str, {isOptional: true}),
      t.Field('src', t.str, {isOptional: true}),
      t.Field('doc', t.str, {isOptional: true}),
      t.Field('authz', t.str, {isOptional: true}),
      t.Field('active', t.bool),
    ]),
  ),
  t.Field(
    'block',
    t.Object([
      t.Field('id', t.String({format: 'ascii', noJsonEscape: true})),
      t.Field('ts', t.num, {format: 'u64'}),
      t.Field('cid', t.String({format: 'ascii', noJsonEscape: true})),
      t.Field('slug', t.String({format: 'ascii', noJsonEscape: true})),
    ]),
  ),
]);
```
