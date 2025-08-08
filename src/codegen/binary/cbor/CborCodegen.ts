import {AbstractBinaryCodegen} from '../AbstractBinaryCodegen';
import {writer} from '../writer';
import {JsExpression} from '@jsonjoy.com/codegen/lib/util/JsExpression';
import {CborEncoder} from '@jsonjoy.com/json-pack/lib/cbor/CborEncoder';
import {lazyKeyedFactory} from '../../util';
import {type MapType, type ObjType, type Type} from '../../../type';
import type {CompiledBinaryEncoder, SchemaPath} from '../../types';

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
    throw new Error('not implemented');
  }

  protected onMap(path: SchemaPath, val: JsExpression, type: MapType): void {
    throw new Error('not implemented');
  }

  protected genEncoder(type: Type): CompiledBinaryEncoder {
    return CborCodegen.get(type);
  }
}
