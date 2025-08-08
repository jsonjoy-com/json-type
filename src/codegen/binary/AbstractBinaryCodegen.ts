import {Codegen, CodegenStepExecJs} from '@jsonjoy.com/codegen';
import {concat} from '@jsonjoy.com/buffers/lib/concat';
import {WriteBlobStep} from './WriteBlobStep';
import {Value} from '../../value/Value';
import {CapacityEstimatorCodegen} from '../capacity';
import {AbstractCodegen} from '../AbstractCodege';
import {floats, ints, uints} from '../../util';
import {JsExpression} from '@jsonjoy.com/codegen/lib/util/JsExpression';
import {DiscriminatorCodegen} from '../discriminator';
import type {BinaryJsonEncoder} from '@jsonjoy.com/json-pack/lib/types';
import type {AnyType, ArrType, BinType, BoolType, ConType, NumType, OrType, RefType, StrType, Type} from '../../type';
import type {CompiledBinaryEncoder, SchemaPath} from '../types';

type Step = WriteBlobStep | CodegenStepExecJs;

export abstract class AbstractBinaryCodegen<Encoder extends BinaryJsonEncoder> extends AbstractCodegen<CompiledBinaryEncoder> {
  protected abstract encoder: Encoder;
  public readonly codegen: Codegen<CompiledBinaryEncoder>;

  constructor(public readonly type: Type, name?: string) {
    super();
    this.codegen = new Codegen<CompiledBinaryEncoder>({
      name: 'toBinary' + (name ? '_' + name : ''),
      args: ['r0', 'encoder'],
      prologue: /* js */ `
var writer = encoder.writer;
writer.ensureCapacity(capacityEstimator(r0));
var uint8 = writer.uint8, view = writer.view;`,
      epilogue: '',
      linkable: {
        Value,
      },
      processSteps: (steps) => {
        const stepsJoined: Step[] = [];
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          if (step instanceof CodegenStepExecJs) stepsJoined.push(step);
          else if (step instanceof WriteBlobStep) {
            const last = stepsJoined[stepsJoined.length - 1];
            if (last instanceof WriteBlobStep) last.arr = concat(last.arr, step.arr);
            else stepsJoined.push(step);
          }
        }
        const execSteps: CodegenStepExecJs[] = [];
        for (const step of stepsJoined) {
          if (step instanceof CodegenStepExecJs) {
            execSteps.push(step);
          } else if (step instanceof WriteBlobStep) {
            execSteps.push(this.codegenBlob(step));
          }
        }
        return execSteps;
      },
    });
    this.codegen.linkDependency(CapacityEstimatorCodegen.get(type), 'capacityEstimator');
  }

  public getBigIntStr(arr: Uint8Array, offset: number): string {
    const buf = new Uint8Array(8);
    for (let i = 0; i < 8; i++) buf[i] = arr[offset + i];
    const view = new DataView(buf.buffer);
    const bigint = view.getBigUint64(0);
    return bigint.toString() + 'n';
  }

  private codegenBlob(step: WriteBlobStep) {
    const lines: string[] = [];
    const ro = this.codegen.getRegister();
    const length = step.arr.length;
    if (length === 1) {
      lines.push(/* js */ `uint8[writer.x++] = ${step.arr[0]};`);
    } else {
      lines.push(`var ${ro} = writer.x;`);
      lines.push(`writer.x += ${step.arr.length};`);
      let i = 0;
      while (i < length) {
        const remaining = length - i;
        if (remaining >= 8) {
          const value = this.getBigIntStr(step.arr, i);
          lines.push(/* js */ `view.setBigUint64(${ro}${i ? ` + ${i}` : ''}, ${value});`);
          i += 8;
        } else if (remaining >= 4) {
          const value = (step.arr[i] << 24) | (step.arr[i + 1] << 16) | (step.arr[i + 2] << 8) | step.arr[i + 3];
          lines.push(/* js */ `view.setInt32(${ro}${i ? ` + ${i}` : ''}, ${value});`);
          i += 4;
        } else if (remaining >= 2) {
          const value = (step.arr[i] << 8) | step.arr[i + 1];
          lines.push(/* js */ `view.setInt16(${ro}${i ? ` + ${i}` : ''}, ${value});`);
          i += 2;
        } else {
          lines.push(/* js */ `uint8[${ro}${i ? ` + ${i}` : ''}] = ${step.arr[i]};`);
          i++;
        }
      }
    }
    const js = lines.join('\n');
    return new CodegenStepExecJs(js);
  }

  public js(js: string): void {
    this.codegen.js(js);
  }

  public gen(callback: (encoder: Encoder) => void): Uint8Array {
    const encoder = this.encoder;
    encoder.writer.reset();
    callback(encoder);
    return encoder.writer.flush();
  }

  public blob(arr: Uint8Array): void {
    this.codegen.step(new WriteBlobStep(arr));
  }

  public compile() {
    return this.codegen.compile();
  }

  protected onAny(path: SchemaPath, r: JsExpression, type: AnyType): void {
    this.codegen.js(`encoder.writeAny(${r.use()});`);
  }

  protected onCon(path: SchemaPath, r: JsExpression, type: ConType): void {
    this.blob(
      this.gen((encoder) => {
        encoder.writeAny(type.literal());
      }),
    );
  }

  protected onBool(path: SchemaPath, r: JsExpression, type: BoolType): void {
    this.codegen.js(/* js */ `encoder.writeBoolean(${r.use()});`);
  }

  protected onNum(path: SchemaPath, r: JsExpression, type: NumType): void {
    const {format} = type.schema;
    const v = r.use();
    const codegen = this.codegen;
    if (uints.has(format)) codegen.js(/* js */ `encoder.writeUInteger(${v});`);
    else if (ints.has(format)) codegen.js(/* js */ `encoder.writeInteger(${v});`);
    else if (floats.has(format)) codegen.js(/* js */ `encoder.writeFloat(${v});`);
    else codegen.js(/* js */ `encoder.writeNumber(${v});`);
  }

  protected onStr(path: SchemaPath, r: JsExpression, type: StrType): void {
    const {ascii, format} = type.schema;
    const codegen = this.codegen;
    // Use ASCII encoding if format is 'ascii' or ascii=true (backward compatibility)
    const v = r.use();
    const useAscii = format === 'ascii' || ascii;
    if (useAscii) codegen.js(/* js */ `encoder.writeAsciiStr(${v});`);
    else codegen.js(/* js */ `encoder.writeStr(${v});`);
  }

  protected onBin(path: SchemaPath, r: JsExpression, type: BinType): void {
    this.codegen.js(/* js */ `encoder.writeBin(${r.use()});`);
  }

  protected onArr(path: SchemaPath, val: JsExpression, type: ArrType): void {
    const codegen = this.codegen;
    const r = codegen.getRegister(); // array
    const rl = codegen.getRegister(); // array.length
    const ri = codegen.getRegister(); // index
    const rItem = codegen.getRegister(); // item
    codegen.js(/* js */ `var ${r} = ${val.use()}, ${rl} = ${r}.length, ${ri} = 0, ${rItem};`);
    codegen.js(/* js */ `encoder.writeArrHdr(${rl});`);
    codegen.js(/* js */ `for(; ${ri} < ${rl}; ${ri}++) {`);
    this.onNode([...path, {r: ri}], new JsExpression(() => /* js */ `${r}[${ri}]`), type._type);
    codegen.js(/* js */ `}`);
  }

  protected onOr(path: SchemaPath, r: JsExpression, type: OrType<Type[]>): void {
    const codegen = this.codegen;
    const discriminator = DiscriminatorCodegen.get(type);
    const d = codegen.linkDependency(discriminator);
    const types = type.types;
    codegen.switch(
      `${d}(${r.use()})`,
      types.map((type, index) => [
        index,
        () => {
          this.onNode(path, r, type);
        },
      ]),
    );
  }

  protected abstract genEncoder(type: Type): CompiledBinaryEncoder;

  protected onRef(path: SchemaPath, r: JsExpression, type: RefType): void {
    const system = type.getSystem();
    const alias = system.resolve(type.ref());
    switch (alias.type.kind()) {
      case 'str':
      case 'bool':
      case 'num':
      case 'any':
      case 'tup': {
        this.onNode(path, r, alias.type);
        break;
      }
      default: {
        const encoder = this.genEncoder(alias.type);
        const codegen = this.codegen;
        const d = codegen.linkDependency(encoder);
        codegen.js(/* js */ `${d}(${r.use()}, encoder);`);
      }
    }
  }
}
