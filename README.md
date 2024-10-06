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
