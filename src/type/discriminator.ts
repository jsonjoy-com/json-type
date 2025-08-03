import {ArrType, BoolType, ConType, NumType, type ObjKeyType, ObjType, StrType} from './classes';
import type {Expr} from '@jsonjoy.com/json-expression';
import type {Type} from './types';

export class Discriminator {
  public static findConst(type: Type): Discriminator | undefined {
    if (type instanceof ConType) {
      return new Discriminator('', type);
    } else if (type instanceof ArrType) {
      const {_head = []} = type;
      // TODO: add support for array tail.
      const types = _head;
      for (let i = 0; i < types.length; i++) {
        const t = types[i];
        const d = Discriminator.findConst(t);
        if (d) return new Discriminator('/' + i + d.path, d.type);
      }

    } else if (type instanceof ObjType) {
      const fields = type.fields as ObjKeyType<string, Type>[];
      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        const d = Discriminator.findConst(f.val);
        if (d) return new Discriminator('/' + f.key + d.path, d.type);
      }
    }
    return undefined;
  }

  public static find(type: Type): Discriminator {
    const constDiscriminator = Discriminator.findConst(type);
    return constDiscriminator ?? new Discriminator('', type);
  }

  public static createExpression(types: Type[]): Expr {
    const length = types.length;
    const specifiers = new Set<string>();
    const discriminators: Discriminator[] = [];
    for (let i = 1; i < length; i++) {
      const type = types[i];
      const d = Discriminator.find(type);
      const specifier = d.toSpecifier();
      if (specifiers.has(specifier)) throw new Error('Duplicate discriminator: ' + specifier);
      specifiers.add(specifier);
      discriminators.push(d);
    }
    let expr: Expr = <any>0;
    for (let i = 0; i < discriminators.length; i++) {
      const d = discriminators[i];
      expr = <Expr>['?', d.condition(), i + 1, expr];
    }
    return expr;
  }

  constructor(
    public readonly path: string,
    public readonly type: Type,
  ) {}

  condition(): Expr {
    if (this.type instanceof ConType) return ['==', this.type.literal(), ['$', this.path]];
    if (this.type instanceof BoolType) return ['==', ['type', ['$', this.path]], 'boolean'];
    if (this.type instanceof NumType) return ['==', ['type', ['$', this.path]], 'number'];
    if (this.type instanceof StrType) return ['==', ['type', ['$', this.path]], 'string'];
    switch (this.typeSpecifier()) {
      case 'obj':
        return ['==', ['type', ['$', this.path]], 'object'];
      case 'arr':
        return ['==', ['type', ['$', this.path]], 'array'];
    }
    throw new Error('Cannot create condition for discriminator: ' + this.toSpecifier());
  }

  typeSpecifier(): string {
    const kind = this.type.kind();
    switch (kind) {
      case 'bool':
      case 'str':
      case 'num':
      case 'con':
        return kind;
      case 'obj':
      case 'map':
        return 'obj';
      case 'arr':
        return 'arr';
      case 'fn':
      case 'fn$':
        return 'fn';
    }
    return '';
  }

  toSpecifier(): string {
    const type = this.type;
    const path = this.path;
    const typeSpecifier = this.typeSpecifier();
    const value = type instanceof ConType ? type.literal() : 0;
    return JSON.stringify([path, typeSpecifier, value]);
  }
}
