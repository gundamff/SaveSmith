/** Little-endian binary helpers for Terraria player plaintext. */

export class BinReader {
  readonly bytes: Uint8Array
  o = 0

  constructor(bytes: Uint8Array) {
    this.bytes = bytes
  }

  remaining(): number {
    return this.bytes.length - this.o
  }

  slice(n: number): Uint8Array {
    if (this.o + n > this.bytes.length) throw new Error('EOF')
    const s = this.bytes.subarray(this.o, this.o + n)
    this.o += n
    return s
  }

  u8(): number {
    if (this.o >= this.bytes.length) throw new Error('EOF')
    return this.bytes[this.o++]!
  }

  u16(): number {
    const a = this.u8()
    const b = this.u8()
    return a | (b << 8)
  }

  i32(): number {
    const a = this.u8()
    const b = this.u8()
    const c = this.u8()
    const d = this.u8()
    return (a | (b << 8) | (c << 16) | (d << 24)) | 0
  }

  i64bytes(): Uint8Array {
    return this.slice(8)
  }

  bool(): boolean {
    return this.u8() !== 0
  }

  /** .NET BinaryWriter 7-bit encoded length + UTF-8 */
  string(): string {
    let len = 0
    let shift = 0
    for (;;) {
      const b = this.u8()
      len |= (b & 0x7f) << shift
      if ((b & 0x80) === 0) break
      shift += 7
      if (shift > 35) throw new Error('bad 7bit len')
    }
    const raw = this.slice(len)
    return new TextDecoder().decode(raw)
  }

  rest(): Uint8Array {
    return this.slice(this.remaining())
  }
}

export class BinWriter {
  private parts: number[] = []

  u8(v: number): void {
    this.parts.push(v & 0xff)
  }

  u16(v: number): void {
    this.u8(v)
    this.u8(v >> 8)
  }

  i32(v: number): void {
    this.u8(v)
    this.u8(v >> 8)
    this.u8(v >> 16)
    this.u8(v >> 24)
  }

  bytes(b: Uint8Array): void {
    for (let i = 0; i < b.length; i++) this.parts.push(b[i]!)
  }

  bool(v: boolean): void {
    this.u8(v ? 1 : 0)
  }

  string(text: string): void {
    const encoded = new TextEncoder().encode(text)
    let len = encoded.length
    while (len >= 0x80) {
      this.u8((len & 0x7f) | 0x80)
      len >>= 7
    }
    this.u8(len)
    this.bytes(encoded)
  }

  toUint8Array(): Uint8Array {
    return Uint8Array.from(this.parts)
  }
}
