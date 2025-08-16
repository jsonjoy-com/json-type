import {ModuleType} from "../type";

export const enum CompactMessageType {
  RequestData = 0,
  RequestComplete = 1,
  RequestError = 2,
  RequestUnsubscribe = 3,

  ResponseData = 4,
  ResponseComplete = 5,
  ResponseError = 6,
  ResponseUnsubscribe = 7,

  Notification = 8,
}


export const system = new ModuleType();
const t = system.t;

// export const CompactMsgId = t.num.format('u32').alias('CompactMsgId');
const MethodName = t.str.min(1).max(32).format('ascii').alias('MethodName');

export const NotificationMessage = t.tuple(
  t.Key('type', t.con(8)),
  t.Key('method', t.Ref<typeof MethodName>('MethodName')),
  t.KeyOpt('data', t.any),
).alias('NotificationMessage');

export const RequestDataMessage = t.Or(
  t.tuple(
    t.con(CompactMessageType.RequestData),
    t.num.format('u32'),
    t.Ref<typeof MethodName>('MethodName'),
  ),
  t.tuple(
    t.con(CompactMessageType.RequestData),
    t.num.format('u32'),
    t.Ref<typeof MethodName>('MethodName'),
    t.any,
  ),
).options({
  discriminator: ['?', ['eq', ['len', ['$', '']], 2], 0, 1],
}).alias('RequestDataMessage');

export const RequestCompleteMessage = t.Or(
  t.tuple(
    t.con(CompactMessageType.RequestComplete),
    t.num.format('u32'),
    t.Ref<typeof MethodName>('MethodName'),
  ),
  t.tuple(
    t.con(CompactMessageType.RequestComplete),
    t.num.format('u32'),
    t.Ref<typeof MethodName>('MethodName'),
    t.any,
  ),
).options({
  discriminator: ['?', ['eq', ['len', ['$', '']], 2], 0, 1],
}).alias('RequestCompleteMessage');

export const RequestErrorMessage = t.tuple(
  t.con(CompactMessageType.RequestError),
  t.num.format('u32'),
  t.Ref<typeof MethodName>('MethodName'),
  t.any,
).alias('RequestErrorMessage');

export const RequestUnsubscribeMessage = t.tuple(
  t.con(CompactMessageType.RequestUnsubscribe),
  t.num.format('u32'),
).alias('RequestUnsubscribeMessage');

export const ResponseDataMessage = t.tuple(
  t.con(CompactMessageType.ResponseData),
  t.num.format('u32'),
  t.any,
).alias('ResponseDataMessage');

export const ResponseCompleteMessage = t.tuple(
  t.con(CompactMessageType.ResponseComplete),
  t.num.format('u32'),
  t.any,
).alias('ResponseCompleteMessage');

export const ResponseErrorMessage = t.tuple(
  t.con(CompactMessageType.ResponseError),
  t.num.format('u32'),
  t.any,
).alias('ResponseErrorMessage');

export const ResponseUnsubscribeMessage = t.tuple(
  t.con(CompactMessageType.ResponseUnsubscribe),
  t.num.format('u32'),
).alias('ResponseUnsubscribeMessage');

export const Message = t.Or(
  NotificationMessage.type,
  RequestDataMessage.type,
  RequestCompleteMessage.type,
  RequestErrorMessage.type,
  RequestUnsubscribeMessage.type,
  ResponseDataMessage.type,
  ResponseCompleteMessage.type,
  ResponseErrorMessage.type,
  ResponseUnsubscribeMessage.type,
).alias('Message');

export const messageBatch = t.array(Message).alias('MessageBatch');
