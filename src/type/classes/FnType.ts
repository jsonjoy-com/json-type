import {printTree} from 'tree-dump/lib/printTree';
import * as schema from '../../schema';
import {AbsType} from './AbsType';
import type {SchemaOf, Type} from '../types';
import type {ResolveType} from '../../system';
import type {Observable} from 'rxjs';
import {Value} from '../../value';

const fnNotImplemented: schema.FunctionValue<any, any> = async () => {
  throw new Error('NOT_IMPLEMENTED');
};

const toStringTree = (tab: string = '', type: FnType<Type, Type, any> | FnRxType<Type, Type, any>) => {
  return printTree(tab, [
    (tab) => 'req: ' + type.req.toString(tab + '     '),
    (tab) => 'res: ' + type.res.toString(tab + '     '),
  ]);
};

type FunctionImpl<Req extends Type, Res extends Type, Ctx = unknown> = (
  req: ResolveType<Req>,
  ctx: Ctx,
) => ResolveType<Res> | Promise<ResolveType<Res>>;

export class FnType<Req extends Type, Res extends Type, Ctx = unknown> extends AbsType<
  schema.FunctionSchema<SchemaOf<Req>, SchemaOf<Res>, Ctx>
> {
  protected schema: schema.FunctionSchema<SchemaOf<Req>, SchemaOf<Res>, Ctx>;

  public fn: schema.FunctionValue<schema.TypeOf<SchemaOf<Req>>, schema.TypeOf<SchemaOf<Res>>> = fnNotImplemented;

  constructor(
    public readonly req: Req,
    public readonly res: Res,
    options?: schema.Optional<schema.FunctionSchema<SchemaOf<Req>, SchemaOf<Res>>>,
  ) {
    super();
    this.schema = {
      ...options,
      ...schema.s.Function(schema.s.any, schema.s.any),
    } as any;
  }

  public input<T extends Type>(req: T): FnType<T, Res> {
    return this.inp(req);
  }

  public inp<T extends Type>(req: T): FnType<T, Res> {
    (this as any).req = req;
    return this as any;
  }

  public output<T extends Type>(res: T): FnType<Req, T> {
    return this.out(res);
  }

  public out<T extends Type>(res: T): FnType<Req, T> {
    (this as any).res = res;
    return this as any;
  }

  public io<I extends Type, O extends Type>(request: I, response: O): FnType<I, O, Ctx> {
    return this.inp(request).out(response) as FnType<I, O, Ctx>;
  }

  public signature<I extends Type, O extends Type>(request: I, response: O): FnType<I, O, Ctx> {
    return this.io(request, response) as FnType<I, O, Ctx>;
  }

  public ctx<T>(): FnType<Req, Res, T> {
    return this as any;
  }

  public value(data: ResolveType<FnType<Req, Res, Ctx>>) {
    return new Value<FnType<Req, Res, Ctx>>(this, data);
  }

  public getSchema(): schema.FunctionSchema<SchemaOf<Req>, SchemaOf<Res>, Ctx> {
    return {
      ...this.schema,
      req: this.req.getSchema() as SchemaOf<Req>,
      res: this.res.getSchema() as SchemaOf<Res>,
    };
  }

  public toString(tab: string = ''): string {
    return super.toString(tab) + toStringTree(tab, this);
  }
}

type FunctionStreamingImpl<Req extends Type, Res extends Type, Ctx = unknown> = (
  req: Observable<ResolveType<Req>>,
  ctx: Ctx,
) => Observable<ResolveType<Res>>;

export class FnRxType<Req extends Type, Res extends Type, Ctx = unknown> extends AbsType<
  schema.FunctionStreamingSchema<SchemaOf<Req>, SchemaOf<Res>, Ctx>
> {
  public readonly isStreaming = true;
  protected schema: schema.FunctionStreamingSchema<SchemaOf<Req>, SchemaOf<Res>, Ctx>;

  constructor(
    public readonly req: Req,
    public readonly res: Res,
    options?: schema.Optional<schema.FunctionStreamingSchema<SchemaOf<Req>, SchemaOf<Res>>>,
  ) {
    super();
    this.schema = {
      ...options,
      ...schema.s.Function$(schema.s.any, schema.s.any),
    } as any;
  }

  public request<T extends Type>(req: T): FnType<T, Res> {
    (this as any).req = req;
    return this as any;
  }

  public inp<T extends Type>(req: T): FnType<T, Res> {
    return this.request(req);
  }

  public response<T extends Type>(res: T): FnType<Req, T> {
    (this as any).res = res;
    return this as any;
  }

  public out<T extends Type>(res: T): FnType<Req, T> {
    return this.response(res);
  }

  public getSchema(): schema.FunctionStreamingSchema<SchemaOf<Req>, SchemaOf<Res>, Ctx> {
    return {
      ...this.schema,
      req: this.req.getSchema() as SchemaOf<Req>,
      res: this.res.getSchema() as SchemaOf<Res>,
    };
  }

  public toString(tab: string = ''): string {
    return super.toString(tab) + toStringTree(tab, this);
  }
}
