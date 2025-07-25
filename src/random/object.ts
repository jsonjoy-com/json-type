import {RandomJson} from '@jsonjoy.com/util/lib/json-random';
import type {ObjectType} from '../type/classes/ObjectType';

export function randomObject(type: ObjectType<any>): Record<string, unknown> {
  const schema = type.getSchema();
  const obj: Record<string, unknown> = schema.unknownFields ? <Record<string, unknown>>RandomJson.genObject() : {};
  // Use runtime check to avoid circular import with ObjectOptionalFieldType
  for (const field of (type as any).fields) {
    if (field.constructor.name === 'ObjectOptionalFieldType') if (Math.random() > 0.5) continue;
    obj[field.key] = field.value.random();
  }
  return obj;
}