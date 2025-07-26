Version: 0.1.0
Title: JSON Type Specification
Author: Vadim @streamich Dalecky

# JSON Type Specification

## 1. Overview and Motivation

### What is JSON Type?

**JSON Type** is a concise, regular, and extensible type system for describing JSON structures, language runtime types, API messages, and more. It is designed to be easy to implement in any programming language, and to serve as a foundation for validation, code generation, documentation, and serialization across platforms and environments.

### Motivation

JSON Type addresses several limitations of existing specifications:

- **JSON Schema** is expressive but often verbose, irregular, and difficult to map to language types.
- **JSON Type Definition (JTD, RFC8927)** is regular but intentionally limited and not extensible.
- **JSON Type** unifies and extends these ideas, supporting:
  - Direct mapping to programming language types (TypeScript, Go, Rust, etc.)
  - Expressive and regular node types for all common JSON patterns
  - Discriminated unions and autodiscriminants for robust, safe polymorphism
  - Extensible metadata and custom validation
  - Code generation and optimized (JIT) serialization support
  - Representation for code, API messages, and binary formats (e.g., Protobuf, CBOR)

### Quick Example

A simple user type:

```json
{
  "kind": "obj",
  "title": "User",
  "fields": [
    { "kind": "field", "key": "id", "type": { "kind": "str" }, "title": "User ID" },
    { "kind": "field", "key": "name", "type": { "kind": "str" } },
    { "kind": "field", "key": "age", "type": { "kind": "num", "gte": 0 }, "optional": true }
  ]
}
```

Represents a user object like this:

```json
{
  "id": "123",
  "name": "Alice",
  "age": 30
}
```

This schema is readable, language-agnostic, and can be used to generate code, documentation, validators, or serializers in any environment.

---

## 2. Terminology & Conventions

### Key Terms

- **Schema:** A JSON object describing a type using JSON Type node(s).
- **Node (Type Node):** A JSON object with a `kind` property that defines a type (e.g., `"kind": "str"`).
- **Kind:** The string value of the `kind` property, indicating the node type.
- **Field:** An object property within an object schema, defined by an object node of `"kind": "field"`.
- **Discriminant / Discriminator:** A property or expression that distinguishes between union or variant types.
- **Autodiscriminant:** A discriminant inferred automatically based on schema structure (see below).
- **Optional:** Indicates a field or node may be omitted.

### Notation

- All node types are JSON objects.
- Properties not listed in a node type are ignored unless the node type allows unknown fields.
- Examples use JSON, but the format is language-agnostic.

---

## 3. Core Concepts

### Node Types and Type System

Every node in JSON Type has a `kind` property. The `kind` determines the node’s structure and valid properties.

All nodes support these common optional properties:

- `title` (string): Short name for documentation.
- `intro` (string): Short introduction or summary.
- `description` (string): Detailed description.
- `id` (string): Unique identifier for referencing the type elsewhere.
- `meta` (object): Arbitrary metadata for code generators, UI, etc.
- `examples` (array): An array of example values for the type.
- `deprecated` (object): Marks a type as deprecated, with an optional message.

### Metadata and Extensibility

- `meta` can store any additional information, such as UI hints, custom validation rules, or code generation flags.
- Types may be referenced by `id` via the `ref` node.

---

## 4. Node Types and Their Properties

### 4.1 Primitive Types

#### Any (`any`)

Represents any value (like `any` in TypeScript).

```json
{ "kind": "any" }
```

**Properties:**
- `validator` (string or array): Name(s) of custom validation rules.
- `meta` (object): Custom metadata.

**Example:**
```json
{ "kind": "any" }
```

---

#### Boolean (`bool`)

Represents a boolean value (`true` or `false`).

```json
{ "kind": "bool" }
```

**Properties:**
- `validator` (string or array): Custom validation.

---

#### Number (`num`)

Represents a number, with optional format and constraints.

**Properties:**
- `format` (string): Numeric format (`i`, `u`, `f`, `i8`, `u32`, `f64`, etc.)
- `gt` (number): Greater than (exclusive)
- `gte` (number): Greater or equal (inclusive)
- `lt` (number): Less than (exclusive)
- `lte` (number): Less or equal (inclusive)
- `validator` (string or array): Custom validation.

**Example:**
```json
{
  "kind": "num",
  "format": "u32",
  "gte": 0,
  "lte": 100,
  "examples": [
    { "value": 42, "title": "Typical value" },
    { "value": 100, "title": "Maximum value" }
  ]
}
```

---

#### String (`str`)

Represents a string value.

**Properties:**
- `format` (string): `"ascii"` or `"utf8"`.
- `ascii` (boolean, deprecated): Use `format: "ascii"`.
- `noJsonEscape` (boolean): String can be emitted without JSON character escaping.
- `min` (number): Minimum length.
- `max` (number): Maximum length.
- `validator` (string or array): Custom validation.

**Example:**
```json
{
  "kind": "str",
  "format": "ascii",
  "min": 1,
  "max": 64,
  "examples": [
    { "value": "Alice", "title": "User name" },
    { "value": "Bob", "title": "Another user" }
  ]
}
```

---

#### Binary (`bin`)

Represents binary data, encoding another type.

**Properties:**
- `type` (node): The type encoded in binary.
- `format` (string): Encoding (`json`, `cbor`, `msgpack`, etc.).
- `min` (number): Minimum size in bytes.
- `max` (number): Maximum size in bytes.
- `validator` (string or array): Custom validation.

**Example:**
```json
{ "kind": "bin", "type": { "kind": "any" }, "format": "cbor" }
```

---

### 4.2 Composite Types

#### Array (`arr`)

Represents an array of elements of a single type.

**Properties:**
- `type` (node): Element type.
- `min` (number): Minimum number of elements.
- `max` (number): Maximum number of elements.
- `validator` (string or array): Custom validation.

**Example:**
```json
{ "kind": "arr", "type": { "kind": "num" }, "min": 1, "max": 10 }
```

---

#### Tuple (`tup`)

Represents a fixed-length array, each position with its own type.

**Properties:**
- `types` (array): Array of node types for each position.
- `validator` (string or array): Custom validation.

**Example:**
```json
{ "kind": "tup", "types": [ { "kind": "str" }, { "kind": "num" } ] }
```

---

#### Object (`obj`)

Represents a JSON object with a defined set of fields. `obj` fields are ordered and can be required or optional. Optional fields are usually defined at the end of the `fields` array. Even if in many languages objects are unordered, the order of fields in the schema is a useful feature as the field order can be used in documentation, code generation, and serialization to binary formats.

**Properties:**
- `fields` (array): Array of field nodes (see below).
- `unknownFields` (boolean, deprecated): Allow fields not listed.
- `encodeUnknownFields` (boolean): Emit unknown fields during encoding.
- `validator` (string or array): Custom validation.

**Example:**
```json
{
  "kind": "obj",
  "fields": [
    { "kind": "field", "key": "id", "type": { "kind": "str" } },
    { "kind": "field", "key": "age", "type": { "kind": "num" }, "optional": true }
  ]
}
```

**Valid JSON:**
```json
{
  "id": "123",
  "age": 30
}
```

---

#### Object Field (`field`)

Defines a field within an object schema.

**Properties:**
- `key` (string): Field name.
- `type` (node): Field value type.
- `optional` (boolean): Field is optional.
- `title`/`intro`/`description`: Document the field.

**Example:**
```json
{ "kind": "field", "key": "tags", "type": { "kind": "arr", "type": { "kind": "str" } }, "optional": true }
```

---

#### Map (`map`)

Represents an object/map with arbitrary string keys and uniform value types.

**Properties:**
- `type` (node): Value type.
- `validator` (string or array): Custom validation.

**Example:**
```json
{ "kind": "map", "type": { "kind": "num" } }
```

---

### 4.3 Advanced Types

#### Const (`const`)

Represents a constant value. Useful for enums, discriminants, and singletons.

**Properties:**
- `value` (any): The constant value.
- `validator` (string or array): Custom validation.

**Example:**
```json
{ "kind": "const", "value": "success" }
```

---

#### Reference (`ref`)

References another named type by its `id`.

**Properties:**
- `ref` (string): The referenced type’s `id`.

**Example:**
```json
{ "kind": "ref", "ref": "UserType" }
```

---

#### Or / Union (`or`)

A union of multiple possible types, with a discriminant.

**Properties:**
- `types` (array): Array of possible node types.
- `discriminator` (expression): A JSON Expression which returns the index of the type based on the runtime value.

**Example:**
```json
{
  "kind": "or",
  "types": [
    {
      "kind": "obj",
      "fields": [
        { "kind": "field", "key": "kind", "type": { "kind": "const", "value": "circle" } },
        { "kind": "field", "key": "radius", "type": { "kind": "num" } }
      ]
    },
    {
      "kind": "obj",
      "fields": [
        { "kind": "field", "key": "kind", "type": { "kind": "const", "value": "square" } },
        { "kind": "field", "key": "side", "type": { "kind": "num" } }
      ]
    }
  ],
  "discriminator": ['if', ['==', 'circle', ['get', '/kind']], 0, 1],
}
```

---

## 5. Discriminator and Union Types

### 5.1 Discriminator

The **discriminator** tells how to distinguish between the possible types in an `or` union.

- It is specified as the `discriminator` property of an `or` node.
- The value is typically a property path (e.g., `["kind"]`) or a [JSON Expression](https://jsonjoy.com/specs/json-expression) for advanced cases.
- Each type in the union must be uniquely distinguishable by the discriminator.

**Example:**
```json
{
  "kind": "or",
  "types": [
    { "kind": "obj", "fields": [{ "kind": "field", "key": "tag", "type": { "kind": "const", "value": "a" } }] },
    { "kind": "obj", "fields": [{ "kind": "field", "key": "tag", "type": { "kind": "const", "value": "b" } }] }
  ],
  "discriminator": ["tag"]
}
```

### 5.2 Autodiscriminator

When all types in a union have a `const` field with the same property name, the discriminator can be **automatically inferred**. This is called the *autodiscriminator*.

- Tools can infer `"discriminator": ["tag"]` above automatically.
- This reduces errors and boilerplate.

**Example:**
```json
// Discriminator can be inferred as ["kind"]
{
  "kind": "or",
  "types": [
    { "kind": "obj", "fields": [{ "kind": "field", "key": "kind", "type": { "kind": "const", "value": "circle" } }, ...] },
    { "kind": "obj", "fields": [{ "kind": "field", "key": "kind", "type": { "kind": "const", "value": "square" } }, ...] }
  ]
}
```

- If no explicit `discriminator` is given, tools should attempt autodiscriminant inference.

**Rules:**
- All variants must have a `const` field with the same property name.
- The values must be unique across variants.

---

## 6. Schema Metadata

All nodes may contain the following metadata:

- `meta`: Custom object for code generation, UI, etc.
- `validator`: Name(s) of custom validation rules to apply.
- `examples`: Array of example values (with optional title/intro/description).
- `deprecated`: `{ description?: string }`; marks the type as deprecated.

**Example:**
```json
{
  "kind": "str",
  "id": "userName",
  "meta": { "ui:widget": "input" },
  "examples": [
    { "value": "alice", "title": "Typical user name" }
  ],
  "deprecated": { "description": "Use `displayName` instead" }
}
```

---

## 7. Validation and Constraints

### Validators

- The `validator` property allows referencing standard or custom validators.
- Can be a string (single rule) or an array (multiple).
- Supports standard validators (e.g., `"email"`, `"uuid"`) or custom logic via JSON Expression.

**Example:**
```json
{ "kind": "str", "validator": "email" }
```

### Range and Format Enforcement

- Use `gte`, `lte`, `min`, `max`, `format` for built-in constraints.
- For additional logic, use `validator`.

---

## 8. Type System Semantics

- **Type inference:** Types can be mapped to language types using the structure.
- **Optional and required fields:** Fields are required by default; set `optional: true` for optional fields.
- **Type composition:** Types can be nested and composed arbitrarily.
- **Unknown fields:** By default, unknown fields are rejected. Use `unknownFields: true` or `encodeUnknownFields: true` to allow or preserve them.

---

## 9. Comparison with Other Specifications

### JSON Schema

- JSON Type is less verbose, more regular, and easier to map to language types.
- No ambiguity between assertion and annotation keywords.
- Union types and discriminants are first-class, not a pattern.

### JTD (RFC8927)

- JSON Type is more expressive and extensible.
- Supports metadata, custom validation, union discriminants, and code generation hints.

---

## 10. Serialization and Code Generation

- JSON Type schemas can be used to generate code for any language.
- Supports optimized (JIT) serializers for JSON, CBOR, MessagePack, etc.
- Can generate random values for testing and fuzzing.
- Enables code generation for API clients, servers, and UI forms.

---

## 11. Registry and Referencing

- Types with an `id` can be registered and referenced with `ref`.
- Enables modular schemas and reuse across files or services.
- Supports cyclic and recursive types.

**Example:**
```json
{ "kind": "ref", "ref": "UserType" }
```

---

## 12. Extensibility and Customization

- `meta` fields can be used by tools for display, UI, or code generation.
- Custom validators are supported.
- Compatible with documentation generators and code generators.

---

## 13. Security Considerations

- Always validate JSON Type schemas before use.
- Avoid executing untrusted custom validation code.

---

## 14. Appendix

### 14.1. Example Schemas

#### `any` Type

Represents something of which type is not known.

Example:
```json
{
  "kind": "any",
  "metadata": {
    "description": "Any type"
  }
}
```

#### `bool` Type

Represents a JSON boolean.

Example:
```json
{
  "kind": "bool",
  "meta": {
    "description": "A boolean value"
  }
}
```

#### `num` Type

Represents a JSON number.

Example:
```json
{
  "kind": "num",
  "format": "i32",
  "gte": 0,
  "lte": 100
}
```

#### `str` Type

Represents a JSON string.

Example:
```json
{
  "kind": "str",
  "format": "utf8",
  "min": 1,
  "max": 255
}
```

#### `bin` Type

Represents a binary type.

Example:
```json
{
  "kind": "bin",
  "type": {
    "kind": "str"
  },
  "format": "json",
  "min": 10,
  "max": 1024
}
```

#### `arr` Type

Represents a JSON array.

Example:
```json
{
  "kind": "arr",
  "type": {
    "kind": "num"
  },
  "min": 1,
  "max": 10
}
```

#### `const` Type

Represents a constant value.

Example:
```json
{
  "kind": "const",
  "value": 42
}
```

#### `obj` Type

Represents a JSON object type.

Example:
```json
{
  "kind": "obj",
  "fields": [
    {
      "kind": "field",
      "key": "name",
      "type": {
        "kind": "str"
      },
      "optional": false
    },
    {
      "kind": "field",
      "key": "age",
      "type": {
        "kind": "num",
        "gte": 0
      },
      "optional": true
    }
  ],
  "unknownFields": false
}
```


#### User Schema

```json
{
  "kind": "obj",
  "id": "User",
  "fields": [
    { "kind": "field", "key": "id", "type": { "kind": "str" } },
    { "kind": "field", "key": "name", "type": { "kind": "str" } },
    { "kind": "field", "key": "email", "type": { "kind": "str", "validator": "email" } },
    { "kind": "field", "key": "roles", "type": { "kind": "arr", "type": { "kind": "str" } } }
  ]
}
```

#### Tagged Union Example

```json
{
  "kind": "or",
  "types": [
    {
      "kind": "obj",
      "fields": [
        { "kind": "field", "key": "type", "type": { "kind": "const", "value": "user" } },
        { "kind": "field", "key": "id", "type": { "kind": "str" } }
      ]
    },
    {
      "kind": "obj",
      "fields": [
        { "kind": "field", "key": "type", "type": { "kind": "const", "value": "admin" } },
        { "kind": "field", "key": "level", "type": { "kind": "num" } }
      ]
    }
  ],
  "discriminator": ["type"]
}
```

---

### 14.2. References

- [JSON Schema](https://json-schema.org/)
- [JSON Type Definition (RFC8927)](https://www.rfc-editor.org/rfc/rfc8927)
- [json-type library](https://github.com/jsonjoy-com/json-type)
- [JSON Expression language](https://jsonjoy.com/specs/json-expression)

---

### 14.3. Further Reading and Tools

- [json-type Playground](https://jsonjoy.com/type)
- [json-type npm package](https://www.npmjs.com/package/@jsonjoy.com/json-type)
- [JSON Expression language](https://jsonjoy.com/specs/json-expression)
