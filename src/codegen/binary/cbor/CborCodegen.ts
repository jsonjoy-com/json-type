import {lazy} from '@jsonjoy.com/util/lib/lazyFunction';
import {AbstractBinaryCodegen} from '../AbstractBinaryCodegen';
import {writer} from '../writer';
import {JsExpression} from '@jsonjoy.com/codegen/lib/util/JsExpression';
import {CborEncoder} from '@jsonjoy.com/json-pack/lib/cbor/CborEncoder';
import {type ArrType, type MapType, type ObjType, type Type} from '../../../type';
import type {CompiledBinaryEncoder, SchemaPath} from '../../types';

const CACHE = new WeakMap<Type, CompiledBinaryEncoder>;

export class CborCodegen extends AbstractBinaryCodegen<CborEncoder> {
  public static readonly get = (type: Type, name?: string) => {
    const fn = CACHE.get(type);
    if (fn) return fn;
    return lazy(() => {
      const codegen = new CborCodegen(type, name);
      const r = codegen.codegen.options.args[0];
      const expression = new JsExpression(() => r);
      codegen.onNode([], expression, type);
      const newFn = codegen.compile();
      CACHE.set(type, newFn);
      return newFn;
    });
  };

  protected encoder = new CborEncoder(writer);

  protected onArr(path: SchemaPath, r: JsExpression, type: ArrType): void {
    throw new Error('not implemented');
  }

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
