import {AbstractBinaryCodegen} from '../AbstractBinaryCodegen';
import {writer} from '../writer';
import {JsExpression} from '@jsonjoy.com/codegen/lib/util/JsExpression';
import {CborEncoder} from '@jsonjoy.com/json-pack/lib/cbor/CborEncoder';
import {lazyKeyedFactory} from '../../util';
import {ObjKeyOptType, type MapType, type ObjType, type Type} from '../../../type';
import type {CompiledBinaryEncoder, SchemaPath} from '../../types';
import {normalizeAccessor} from '@jsonjoy.com/codegen/lib/util/normalizeAccessor';

export class CborCodegen extends AbstractBinaryCodegen<CborEncoder> {
  public static readonly get = lazyKeyedFactory((type: Type, name?: string) => {
    const codegen = new CborCodegen(type, name);
    const r = codegen.codegen.options.args[0];
    const expression = new JsExpression(() => r);
    codegen.onNode([], expression, type);
    return codegen.compile();
  });

  protected encoder = new CborEncoder(writer);

  protected onObj(path: SchemaPath, value: JsExpression, type: ObjType): void {
    const codegen = this.codegen;
    const r = codegen.r();
    const fields = type.fields;
    const length = fields.length;
    const requiredFields = fields.filter((field) => !(field instanceof ObjKeyOptType));
    const optionalFields = fields.filter((field) => field instanceof ObjKeyOptType);
    const requiredLength = requiredFields.length;
    const optionalLength = optionalFields.length;
    const encodeUnknownFields = !!type.schema.encodeUnknownFields;
    const emitRequiredFields = () => {
      for (let i = 0; i < requiredLength; i++) {
        const field = requiredFields[i];
        this.blob(this.gen((encoder) => encoder.writeStr(field.key)));
        const accessor = normalizeAccessor(field.key);
        this.onNode([...path, field.key], new JsExpression(() => `${r}${accessor}`), field.val);
      }
    };
    const emitOptionalFields = () => {
      for (let i = 0; i < optionalLength; i++) {
        const field = optionalFields[i];
        const accessor = normalizeAccessor(field.key);
        codegen.js(`if (${JSON.stringify(field.key)} in ${r}) {`);
        this.blob(this.gen((encoder) => encoder.writeStr(field.key)));
        this.onNode([...path, field.key], new JsExpression(() => `${r}${accessor}`), field.val);
        codegen.js(`}`);
      }
    };
    const emitUnknownFields = () => {
      const rKeys = codegen.r();
      const rKey = codegen.r();
      const ri = codegen.r();
      const rLength = codegen.r();
      const keys = fields.map((field) => JSON.stringify(field.key));
      const rKnownFields = codegen.addConstant(`new Set([${keys.join(',')}])`);
      codegen.js(`var ${rKeys} = Object.keys(${r}), ${rLength} = ${rKeys}.length, ${rKey};`);
      codegen.js(`for (var ${ri} = 0; ${ri} < ${rLength}; ${ri}++) {`);
      codegen.js(`${rKey} = ${rKeys}[${ri}];`);
      codegen.js(`if (${rKnownFields}.has(${rKey})) continue;`);
      codegen.js(`encoder.writeStr(${rKey});`);
      codegen.js(`encoder.writeAny(${r}[${rKey}]);`);
      codegen.js(`}`);
    };
    codegen.js(/* js */ `var ${r} = ${value.use()};`);
    if (!encodeUnknownFields && !optionalLength) {
      this.blob(this.gen((encoder) => encoder.writeObjHdr(length)));
      emitRequiredFields();
    } else if (!encodeUnknownFields) {
      this.blob(this.gen((encoder) => encoder.writeStartObj()));
      emitRequiredFields();
      emitOptionalFields();
      this.blob(this.gen((encoder) => encoder.writeEndObj()));
    } else {
      this.blob(this.gen((encoder) => encoder.writeStartObj()));
      emitRequiredFields();
      emitOptionalFields();
      emitUnknownFields();
      this.blob(this.gen((encoder) => encoder.writeEndObj()));
    }
  }

  protected onMap(path: SchemaPath, val: JsExpression, type: MapType): void {
    throw new Error('not implemented');
  }

  protected genEncoder(type: Type): CompiledBinaryEncoder {
    return CborCodegen.get(type);
  }
}
