import {AbsType} from './AbsType';
import type * as schema from '../../schema';

export class BoolType extends AbsType<schema.BoolSchema> {
  // public toJson(value: unknown, system: TypeSystem | undefined = this.system) {
  //   return (value ? 'true' : 'false') as json_string<boolean>;
  // }
}
