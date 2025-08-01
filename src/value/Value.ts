import {type Printable, printTree} from 'tree-dump';
import type {ResolveType} from '../system/types';
import type {Type} from '../type/types';

export class Value<T extends Type = Type> implements Printable {
  constructor(
    public type: T,
    public data: ResolveType<T>,
  ) {}

  // /**
  //  * @deprecated
  //  * @todo Remove this method in the future.
  //  */
  // public encode(codec: JsonValueCodec): void {
  //   const value = this.data;
  //   const type = this.type;
  //   if (value === undefined) return;
  //   const encoder = codec.encoder;
  //   if (!type) encoder.writeAny(value);
  //   else type.encoder(codec.format)(value, encoder);
  // }

  public toString(tab: string = ''): string {
    return 'Value' + printTree(tab, [(tab) => this.type.toString(tab)]);
  }
}

// if (process.env.NODE_ENV !== 'production') {
//   const encode = Value.prototype.encode;
//   Value.prototype.encode = function (codec: JsonValueCodec): void {
//     try {
//       encode.call(this, codec);
//     } catch (error) {
//       try {
//         // tslint:disable-next-line no-console
//         console.error(error);
//         const type = this.type;
//         if (type) {
//           const err = type.validator('object')(this.data);
//           // tslint:disable-next-line no-console
//           console.error(err);
//         }
//       } catch {}
//       throw error;
//     }
//   };
// }
