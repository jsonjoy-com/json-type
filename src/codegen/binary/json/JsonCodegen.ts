import {lazy} from '@jsonjoy.com/util/lib/lazyFunction';
import {AbstractBinaryCodegen} from '../AbstractBinaryCodegen';
import {writer} from '../writer';
import {JsExpression} from '@jsonjoy.com/codegen/lib/util/JsExpression';
import {JsonEncoder} from '@jsonjoy.com/json-pack/lib/json/JsonEncoder';
import type {AnyType, ArrType, BinType, BoolType, ConType, MapType, NumType, ObjType, OrType, RefType, StrType, Type} from '../../../type';
import type {CompiledBinaryEncoder, SchemaPath} from '../../types';

const CACHE = new WeakMap<Type, CompiledBinaryEncoder>;

export class JsonCodegen extends AbstractBinaryCodegen<JsonEncoder> {
  public static readonly get = (type: Type, name?: string) => {
    const fn = CACHE.get(type);
    if (fn) return fn;
    return lazy(() => {
      const codegen = new JsonCodegen(type, name);
      const r = codegen.codegen.options.args[0];
      const expression = new JsExpression(() => r);
      codegen.onNode([], expression, type);
      const newFn = codegen.compile();
      CACHE.set(type, newFn);
      return newFn;
    });
  };

  protected encoder = new JsonEncoder(writer);

  protected onArr(path: SchemaPath, r: JsExpression, type: ArrType): void {
    throw new Error('not implemented');
  }
  protected onObj(path: SchemaPath, r: JsExpression, type: ObjType): void {
    throw new Error('not implemented');
  }
  protected onMap(path: SchemaPath, r: JsExpression, type: MapType): void {
    throw new Error('not implemented');
  }
  protected onRef(path: SchemaPath, r: JsExpression, type: RefType): void {
    throw new Error('not implemented');
  }
  protected onOr(path: SchemaPath, r: JsExpression, type: OrType): void {
    throw new Error('not implemented');
  }
}
