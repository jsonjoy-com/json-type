import {t} from '../../index';

describe('JTD converter', () => {
  test('string type', () => {
    const stringType = t.str;
    const jtdForm = stringType.toJtdForm();
    expect(jtdForm).toEqual({type: 'string'});
  });

  test('number type with format', () => {
    const numberType = t.num.options({format: 'u8'});
    const jtdForm = numberType.toJtdForm();
    expect(jtdForm).toEqual({type: 'uint8'});
  });

  test('boolean type', () => {
    const boolType = t.bool;
    const jtdForm = boolType.toJtdForm();
    expect(jtdForm).toEqual({type: 'boolean'});
  });

  test('const type with string value', () => {
    const constType = t.Const('hello');
    const jtdForm = constType.toJtdForm();
    expect(jtdForm).toEqual({type: 'string'});
  });

  test('const type with number value', () => {
    const constType = t.Const(255);
    const jtdForm = constType.toJtdForm();
    expect(jtdForm).toEqual({type: 'uint8'});
  });

  test('any type', () => {
    const anyType = t.any;
    const jtdForm = anyType.toJtdForm();
    expect(jtdForm).toEqual({nullable: true});
  });

  test('array type', () => {
    const arrayType = t.Array(t.str);
    const jtdForm = arrayType.toJtdForm();
    expect(jtdForm).toEqual({
      elements: [{type: 'string'}],
    });
  });

  test('object type', () => {
    const objectType = t.Object(t.prop('name', t.str), t.propOpt('age', t.num));
    const jtdForm = objectType.toJtdForm();
    expect(jtdForm).toEqual({
      properties: {
        name: {type: 'string'},
      },
      optionalProperties: {
        age: {type: 'float64'},
      },
    });
  });
});
