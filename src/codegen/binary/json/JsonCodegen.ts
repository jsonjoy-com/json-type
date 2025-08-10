import {JsExpression} from '@jsonjoy.com/codegen/lib/util/JsExpression';
import {normalizeAccessor} from '@jsonjoy.com/codegen/lib/util/normalizeAccessor';
import {JsonEncoder} from '@jsonjoy.com/json-pack/lib/json/JsonEncoder';
import {type ArrType, type MapType, ObjKeyOptType, type ObjType, type Type} from '../../../type';
import type {CompiledBinaryEncoder, SchemaPath} from '../../types';
import {lazyKeyedFactory} from '../../util';
import {AbstractBinaryCodegen} from '../AbstractBinaryCodegen';
import {writer} from '../writer';

export class JsonCodegen extends AbstractBinaryCodegen<JsonEncoder> {
  public static readonly get = lazyKeyedFactory((type: Type, name?: string) => {
    const codegen = new JsonCodegen(type, name);
    const r = codegen.codegen.options.args[0];
    const expression = new JsExpression(() => r);
    codegen.onNode([], expression, type);
    return codegen.compile();
  });

  protected encoder = new JsonEncoder(writer);

  protected onArr(path: SchemaPath, r: JsExpression, type: ArrType): void {
    const codegen = this.codegen;
    const rLen = codegen.var(/* js */ `${r.use()}.length`);
    const {_head = [], _type, _tail = []} = type;
    const headLen = _head.length;
    const tailLen = _tail.length;
    const constLen = headLen + tailLen;
    if (constLen) {
      codegen.if(/* js */ `${rLen} < ${constLen}`, () => {
        codegen.js(`throw new Error('ARR_LEN');`);
      });
    }
    codegen.if(
      /* js */ `${rLen} === 0`,
      () => {
        this.blob(
          this.gen((encoder) => {
            encoder.writeStartArr();
            encoder.writeEndArr();
          }),
        );
      },
      () => {
        const ri = codegen.var('0');
        const separatorBlob = this.gen((encoder) => encoder.writeObjSeparator());
        this.blob(
          this.gen((encoder) => {
            encoder.writeStartArr();
          }),
        );
        if (headLen) {
          for (let i = 0; i < headLen; i++) {
            const isLast = i === headLen - 1;
            this.onNode([...path, {r: i + ''}], new JsExpression(() => /* js */ `${r.use()}[${i}]`), _head[i]);
            if (!isLast) this.blob(separatorBlob);
          }
          codegen.js(/* js */ `${ri} += ${headLen}`);
        }
        if (_type) {
          if (!_head.length) {
            codegen.if(`${rLen} > ${_tail.length}`, () => {
              this.onNode([...path, {r: '0'}], new JsExpression(() => /* js */ `${r.use()}[0]`), type._type);
              codegen.js(/* js */ `${ri}++`);
            });
          }
          codegen.js(/* js */ `for(; ${ri} < ${rLen} - ${_tail.length}; ${ri}++) {`);
          this.blob(separatorBlob);
          this.onNode([...path, {r: ri}], new JsExpression(() => /* js */ `${r.use()}[${ri}]`), type._type);
          codegen.js(/* js */ `}`);
        }
        if (tailLen) {
          for (let i = 0; i < tailLen; i++) {
            const isFirst = i === 0;
            if (isFirst) {
              codegen.if(`${ri} + ${i} > 0`, () => {
                this.blob(separatorBlob);
              });
            } else {
              this.blob(separatorBlob);
            }
            this.onNode(
              [...path, {r: `${ri} + ${i}`}],
              new JsExpression(() => /* js */ `${r.use()}[${ri}+${i}]`),
              _tail[i],
            );
          }
        }
        this.blob(
          this.gen((encoder) => {
            encoder.writeEndArr();
          }),
        );
      },
    );
  }

  protected onObj(path: SchemaPath, value: JsExpression, type: ObjType): void {
    const codegen = this.codegen;
    const r = codegen.var(value.use());
    const fields = type.keys;
    const requiredFields = fields.filter((field) => !(field instanceof ObjKeyOptType));
    const optionalFields = fields.filter((field) => field instanceof ObjKeyOptType);
    const requiredLength = requiredFields.length;
    const optionalLength = optionalFields.length;
    const encodeUnknownFields = !!type.schema.encodeUnknownKeys;
    const separatorBlob = this.gen((encoder) => encoder.writeObjSeparator());
    const keySeparatorBlob = this.gen((encoder) => encoder.writeObjKeySeparator());
    const endBlob = this.gen((encoder) => encoder.writeEndObj());
    const emitRequiredFields = () => {
      for (let i = 0; i < requiredLength; i++) {
        const field = requiredFields[i];
        this.blob(
          this.gen((encoder) => {
            encoder.writeStr(field.key);
            encoder.writeObjKeySeparator();
          }),
        );
        const accessor = normalizeAccessor(field.key);
        this.onNode([...path, field.key], new JsExpression(() => `(${r}${accessor})`), field.val);
        this.blob(separatorBlob);
      }
    };
    const emitOptionalFields = () => {
      for (let i = 0; i < optionalLength; i++) {
        const field = optionalFields[i];
        const accessor = normalizeAccessor(field.key);
        codegen.if(`${r}${accessor} !== undefined`, () => {
          this.blob(
            this.gen((encoder) => {
              encoder.writeStr(field.key);
            }),
          );
          this.blob(keySeparatorBlob);
          this.onNode([...path, field.key], new JsExpression(() => `${r}${accessor}`), field.val);
          this.blob(separatorBlob);
        });
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
      this.blob(keySeparatorBlob);
      codegen.js(`encoder.writeAny(${r}[${rKey}]);`);
      this.blob(separatorBlob);
      codegen.js(`}`);
    };
    const emitEnding = () => {
      const rewriteLastSeparator = () => {
        for (let i = 0; i < endBlob.length; i++) codegen.js(`uint8[writer.x - ${endBlob.length - i}] = ${endBlob[i]};`);
      };
      if (requiredFields.length) {
        rewriteLastSeparator();
      } else {
        codegen.if(
          `uint8[writer.x - 1] === ${separatorBlob[separatorBlob.length - 1]}`,
          () => {
            rewriteLastSeparator();
          },
          () => {
            this.blob(endBlob);
          },
        );
      }
    };
    this.blob(
      this.gen((encoder) => {
        encoder.writeStartObj();
      }),
    );
    if (!encodeUnknownFields && !optionalLength) {
      emitRequiredFields();
      emitEnding();
    } else if (!encodeUnknownFields) {
      emitRequiredFields();
      emitOptionalFields();
      emitEnding();
    } else {
      emitRequiredFields();
      emitOptionalFields();
      emitUnknownFields();
      emitEnding();
    }
  }

  protected onMap(path: SchemaPath, val: JsExpression, type: MapType): void {
    const objStartBlob = this.gen((encoder) => encoder.writeStartObj());
    const objEndBlob = this.gen((encoder) => encoder.writeEndObj());
    const separatorBlob = this.gen((encoder) => encoder.writeObjSeparator());
    const keySeparatorBlob = this.gen((encoder) => encoder.writeObjKeySeparator());
    const codegen = this.codegen;
    const r = codegen.var(val.use());
    const rKeys = codegen.var(`Object.keys(${r})`);
    const rKey = codegen.var();
    const rLength = codegen.var(`${rKeys}.length`);
    this.blob(objStartBlob);
    codegen.if(`${rLength}`, () => {
      codegen.js(`${rKey} = ${rKeys}[0];`);
      codegen.js(`encoder.writeStr(${rKey});`);
      this.blob(keySeparatorBlob);
      this.onNode([...path, {r: rKey}], new JsExpression(() => `${r}[${rKey}]`), type._value);
    });
    codegen.js(`for (var i = 1; i < ${rLength}; i++) {`);
    codegen.js(`${rKey} = ${rKeys}[i];`);
    this.blob(separatorBlob);
    codegen.js(`encoder.writeStr(${rKey});`);
    this.blob(keySeparatorBlob);
    this.onNode([...path, {r: rKey}], new JsExpression(() => `${r}[${rKey}]`), type._value);
    codegen.js(`}`);
    this.blob(objEndBlob);
  }

  protected genEncoder(type: Type): CompiledBinaryEncoder {
    return JsonCodegen.get(type);
  }
}
