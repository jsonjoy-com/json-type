import type * as schema from '../../schema';
import {asString} from '@jsonjoy.com/util/lib/strings/asString';
import {AbsType} from './AbsType';
import {isAscii, isUtf8} from '../../util/stringFormats';
import {ValidationError} from '../../constants';
import type {ValidatorCodegenContext} from '../../codegen/validator/ValidatorCodegenContext';
import type {ValidationPath} from '../../codegen/validator/types';
import type {JsonTextEncoderCodegenContext} from '../../codegen/json/JsonTextEncoderCodegenContext';
import type {CborEncoderCodegenContext} from '../../codegen/binary/CborEncoderCodegenContext';
import type {JsonEncoderCodegenContext} from '../../codegen/binary/JsonEncoderCodegenContext';
import type {BinaryEncoderCodegenContext} from '../../codegen/binary/BinaryEncoderCodegenContext';
import type {JsExpression} from '@jsonjoy.com/util/lib/codegen/util/JsExpression';
import type {MessagePackEncoderCodegenContext} from '../../codegen/binary/MessagePackEncoderCodegenContext';
import type {BinaryJsonEncoder} from '@jsonjoy.com/json-pack/lib/types';
import type {TypeSystem} from '../../system/TypeSystem';
import type {json_string} from '@jsonjoy.com/util/lib/json-brand';
import type * as ts from '../../typescript/types';
import type * as jtd from '../../jtd/types';

export class StrType extends AbsType<schema.StrSchema> {
  constructor(protected schema: schema.StrSchema) {
    super();
  }

  public format(format: schema.StrSchema['format']): this {
    this.schema.format = format;
    return this;
  }

  public min(min: schema.StrSchema['min']): this {
    this.schema.min = min;
    return this;
  }

  public max(max: schema.StrSchema['max']): this {
    this.schema.max = max;
    return this;
  }

  public toJson(value: unknown, system: TypeSystem | undefined = this.system): json_string<unknown> {
    return <json_string<string>>(this.schema.noJsonEscape ? '"' + value + '"' : asString(value as string));
  }
}
