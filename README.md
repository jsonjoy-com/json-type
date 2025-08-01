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

## Quick Start

Define a user schema and validate data in just a few lines:

```ts
import {t} from '@jsonjoy.com/json-type';

// Define a user type
const User = t.Object([
  t.prop('id', t.Number()),
  t.prop('name', t.String()),
  t.prop('email', t.String()),
  t.propOpt('age', t.Number({gte: 0, lte: 120}))
]);

// Validate data
const isValid = User.validateSchema();
User.validate({
  id: 1,
  name: "Alice",
  email: "alice@example.com",
  age: 30
}); // ✅ Valid

// Generate random test data
const randomUser = User.random();
// { id: 42, name: "xyz123", email: "abc", age: 25 }
```

## Advanced Features

JSON Type goes beyond basic validation with powerful JIT compilation:

```ts
// Compile ultra-fast validators
const validator = User.compileValidator({errors: 'boolean'});
const isValid = validator(userData); // Blazing fast validation

// Generate TypeScript types
const tsCode = User.toTypeScript();
// type User = { id: number; name: string; email: string; age?: number; }

// Compile optimized serializers
const toJson = User.compileEncoder('json');
const jsonString = toJson(userData); // Faster than JSON.stringify

const toCbor = User.compileCborEncoder();
const cborBytes = toCbor(userData); // Binary serialization
```

## Real-World Example

Build type-safe APIs with complex schemas:

```ts
import {t} from '@jsonjoy.com/json-type';

// Define API request/response types
const CreatePostRequest = t.Object([
  t.prop('title', t.String({min: 1, max: 100})),
  t.prop('content', t.String({min: 10})),
  t.prop('tags', t.Array(t.String(), {max: 5})),
  t.prop('published', t.Boolean())
]);

const Post = t.Object([
  t.prop('id', t.String()),
  t.prop('title', t.String()),
  t.prop('content', t.String()),
  t.prop('tags', t.Array(t.String())),
  t.prop('published', t.Boolean()),
  t.prop('createdAt', t.Number({format: 'u64'})),
  t.prop('author', t.Object([
    t.prop('id', t.String()),
    t.prop('name', t.String())
  ]))
]);

const CreatePostResponse = t.Object([
  t.prop('success', t.Boolean()),
  t.prop('post', Post),
  t.propOpt('error', t.String())
]);

// Use in your API
function createPost(data: unknown) {
  CreatePostRequest.validate(data); // Throws if invalid
  
  // Your business logic here...
  
  return CreatePostResponse.random(); // Type-safe response
}
```

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

## Node Types

JSON Type provides a comprehensive set of node types for modeling JSON-like data structures. Each node type has a `kind` property that identifies its type, along with specific properties and constraints.

### Core Types

#### AnySchema (`any`)
Represents data of unknown type.

```ts
interface AnySchema {
  kind: 'any';
  validator?: string | string[];  // Custom validation rules
  metadata?: Record<string, unknown>;  // Custom metadata
}
```

**Example:**
```ts
s.Any()  // { kind: 'any' }
```

#### BooleanSchema (`bool`)
Represents a JSON boolean value.

```ts
interface BooleanSchema {
  kind: 'bool';
  validator?: string | string[];  // Custom validation rules
}
```

**Example:**
```ts
s.Boolean()  // { kind: 'bool' }
```

#### NumberSchema (`num`)
Represents a JSON number with optional format and range constraints.

```ts
interface NumberSchema {
  kind: 'num';
  format?: 'i' | 'u' | 'f' | 'i8' | 'i16' | 'i32' | 'i64' | 'u8' | 'u16' | 'u32' | 'u64' | 'f32' | 'f64';
  gt?: number;      // Greater than (exclusive)
  gte?: number;     // Greater than or equal to
  lt?: number;      // Less than (exclusive) 
  lte?: number;     // Less than or equal to
  validator?: string | string[];
}
```

**Format options:**
- `i*` - Signed integers (i8, i16, i32, i64)
- `u*` - Unsigned integers (u8, u16, u32, u64)  
- `f*` - Floating point (f32, f64)

**Examples:**
```ts
s.Number()                           // { kind: 'num' }
s.Number({format: 'u32'})           // 32-bit unsigned integer
s.Number({gte: 0, lte: 100})        // Number between 0 and 100
```

#### StringSchema (`str`)
Represents a JSON string with optional format and length constraints.

```ts
interface StringSchema {
  kind: 'str';
  format?: 'ascii' | 'utf8';        // Character encoding format
  ascii?: boolean;                   // @deprecated Use format: 'ascii'
  noJsonEscape?: boolean;            // Skip JSON escaping for performance
  min?: number;                      // Minimum length
  max?: number;                      // Maximum length  
  validator?: string | string[];
}
```

**Examples:**
```ts
s.String()                                    // { kind: 'str' }
s.String({format: 'ascii'})                  // ASCII-only string
s.String({min: 1, max: 50})                  // String with length constraints
s.String({format: 'ascii', noJsonEscape: true})  // Optimized ASCII string
```

#### BinarySchema (`bin`)
Represents binary data with an encoded type.

```ts
interface BinarySchema {
  kind: 'bin';
  type: TType;                       // Type of value encoded in binary
  format?: 'json' | 'cbor' | 'msgpack' | 'resp3' | 'ion' | 'bson' | 'ubjson' | 'bencode';
  min?: number;                      // Minimum size in bytes
  max?: number;                      // Maximum size in bytes
  validator?: string | string[];
}
```

**Examples:**
```ts
s.Binary(s.String())                         // Binary-encoded string
s.Binary(s.Object(), {format: 'cbor'})      // CBOR-encoded object
```

### Composite Types

#### ArraySchema (`arr`)  
Represents a JSON array with elements of a specific type.

```ts
interface ArraySchema {
  kind: 'arr';
  type: TType;                       // Type of array elements
  min?: number;                      // Minimum number of elements
  max?: number;                      // Maximum number of elements
  validator?: string | string[];
}
```

**Examples:**
```ts
s.Array(s.String())                  // Array of strings
s.Array(s.Number(), {min: 1, max: 10})  // Array with 1-10 numbers
```

#### TupleSchema (`tup`)
Represents a fixed-length array with specific types for each position.

```ts
interface TupleSchema {
  kind: 'tup';
  types: TType[];                    // Types for each position
  validator?: string | string[];
}
```

**Example:**
```ts
s.Tuple(s.String(), s.Number(), s.Boolean())  // [string, number, boolean]
```

#### ObjectSchema (`obj`)
Represents a JSON object with defined fields.

```ts
interface ObjectSchema {
  kind: 'obj';
  fields: ObjectFieldSchema[];       // Defined object fields
  unknownFields?: boolean;           // @deprecated Allow undefined fields  
  encodeUnknownFields?: boolean;     // Include unknown fields in output
  validator?: string | string[];
}
```

**Examples:**
```ts
s.Object([
  s.prop('name', s.String()),
  s.propOpt('age', s.Number())       // Optional field
])
```

#### ObjectFieldSchema (`field`)
Represents a single field in an object.

```ts
interface ObjectFieldSchema {
  kind: 'field';
  key: string;                       // Field name
  type: TType;                       // Field value type
  optional?: boolean;                // Whether field is optional
}
```

**Examples:**
```ts
s.prop('id', s.String())             // Required field
s.propOpt('description', s.String()) // Optional field  
```

#### MapSchema (`map`)
Represents an object treated as a map with string keys and uniform value types.

```ts
interface MapSchema {
  kind: 'map';
  type: TType;                       // Type of all values
  validator?: string | string[];  
}
```

**Example:**
```ts
s.Map(s.Number())                    // Object with number values
```

### Advanced Types

#### ConstSchema (`const`)
Represents a constant value.

```ts
interface ConstSchema {
  kind: 'const';
  value: any;                        // The constant value
  validator?: string | string[];
}
```

**Examples:**
```ts
s.Const('hello' as const)            // Constant string
s.Const(42 as const)                 // Constant number
s.Const(null)                        // Null constant
```

#### RefSchema (`ref`)  
References another type by ID.

```ts
interface RefSchema {
  kind: 'ref';
  ref: string;                       // ID of referenced type
}
```

**Example:**
```ts
s.Ref('UserType')                    // Reference to type with ID 'UserType'
```

#### OrSchema (`or`)
Represents a union type (one of multiple possible types).

```ts
interface OrSchema {
  kind: 'or';
  types: TType[];                    // Possible types
  discriminator: Expr;               // Expression to determine type
}
```

**Example:**
```ts
s.Or(s.String(), s.Number())         // String or number
```

#### FunctionSchema (`fn`)
Represents a function type with request and response.

```ts  
interface FunctionSchema {
  kind: 'fn';
  req: TType;                        // Request type
  res: TType;                        // Response type
}
```

**Example:**
```ts
s.Function(s.String(), s.Number())   // Function: string -> number
```

#### FunctionStreamingSchema (`fn$`)
Represents a streaming function type.

```ts
interface FunctionStreamingSchema {
  kind: 'fn$';
  req: TType;                        // Request stream type  
  res: TType;                        // Response stream type
}
```

**Example:**
```ts
s.Function$(s.String(), s.Number())  // Streaming function
```

### Common Properties

All node types extend the base `TType` interface with these common properties:

```ts
interface TType {
  kind: string;                      // Node type identifier
  
  // Display properties
  title?: string;                    // Human-readable title
  intro?: string;                    // Short description
  description?: string;              // Long description (may include Markdown)
  
  // Metadata
  id?: string;                       // Unique identifier
  meta?: Record<string, unknown>;    // Custom metadata
  examples?: TExample[];             // Usage examples
  
  // Deprecation
  deprecated?: {
    description?: string;            // Deprecation reason and alternative
  };
}
```

### Validation

Many types support custom validation through the `validator` property:

```ts
// Single validator
{ validator: 'email' }

// Multiple validators  
{ validator: ['required', 'email'] }
```

Validation rules are applied using the JSON Expression language for flexible custom constraints.
