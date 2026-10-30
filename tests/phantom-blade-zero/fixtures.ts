import {
  sealPbzsBlock,
  unsealPbzsBlock,
} from "@games/phantom-blade-zero/crypto/pbzsCrypto";

const encoder = new TextEncoder();

export const OODLE_COMPRESSED = Uint8Array.from([
  0x8c,
  0x02,
  0x00,
  0x05,
  0x13,
  0x61,
  0x62,
  0x63,
  0x02,
  0x00,
]);
export const OODLE_PLAIN = encoder.encode("abcbcbcb");

export interface SyntheticSlot {
  name: string;
  compression: number;
  payload: Uint8Array;
  uncompressedSize?: number;
  sealed?: 0 | 1;
}

export interface DirectoryEntryLocation {
  nameLengthOffset: number;
  nameOffset: number;
  compressionOffset: number;
  sealedOffset: number;
  uncompressedSizeOffset: number;
  relativeOffsetOffset: number;
  sealedBlockLengthOffset: number;
}

export async function deflate(payload: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(payload)])
    .stream()
    .pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function makePbzsFixture(
  slots: readonly SyntheticSlot[],
): Promise<Uint8Array> {
  const slotBlocks: Uint8Array[] = [];
  let relativeOffset = 0;
  const entries: Array<{
    slot: SyntheticSlot;
    block: Uint8Array;
    relativeOffset: number;
  }> = [];

  for (const [index, slot] of slots.entries()) {
    const block = await makeBlock(
      slot.payload,
      slot.sealed ?? 1,
      nonce(index + 1),
    );
    slotBlocks.push(block);
    entries.push({ slot, block, relativeOffset });
    relativeOffset += block.length;
  }

  const directoryLength =
    12 +
    entries.reduce(
      (length, { slot }) => length + 2 + encoder.encode(slot.name).length + 14,
      0,
    );
  const directoryBlockLength = directoryLength + 36;
  const outer = outerHeader(slots.length, directoryBlockLength);
  const directory = new Uint8Array(directoryLength);
  directory.set(outer);
  const view = new DataView(directory.buffer);
  let cursor = 12;
  for (const { slot, block, relativeOffset: offset } of entries) {
    const name = encoder.encode(slot.name);
    view.setUint16(cursor, name.length, true);
    cursor += 2;
    directory.set(name, cursor);
    cursor += name.length;
    directory[cursor++] = slot.compression;
    directory[cursor++] = slot.sealed ?? 1;
    view.setUint32(
      cursor,
      slot.uncompressedSize ?? slot.payload.length,
      true,
    );
    cursor += 4;
    view.setUint32(cursor, offset, true);
    cursor += 4;
    view.setUint32(cursor, block.length, true);
    cursor += 4;
  }

  const sealedDirectory = await sealPbzsBlock(
    directory,
    undefined,
    nonce(0),
  );
  return concat([outer, sealedDirectory, ...slotBlocks]);
}

export async function directoryPlain(raw: Uint8Array): Promise<Uint8Array> {
  const length = new DataView(
    raw.buffer,
    raw.byteOffset,
    raw.byteLength,
  ).getUint32(8, true);
  return unsealPbzsBlock(raw.slice(12, 12 + length));
}

export function directoryEntryLocations(
  plain: Uint8Array,
  count: number,
): DirectoryEntryLocation[] {
  const view = new DataView(plain.buffer, plain.byteOffset, plain.byteLength);
  const result: DirectoryEntryLocation[] = [];
  let cursor = 12;
  for (let index = 0; index < count; index++) {
    const nameLengthOffset = cursor;
    const nameLength = view.getUint16(cursor, true);
    cursor += 2;
    const nameOffset = cursor;
    cursor += nameLength;
    result.push({
      nameLengthOffset,
      nameOffset,
      compressionOffset: cursor,
      sealedOffset: cursor + 1,
      uncompressedSizeOffset: cursor + 2,
      relativeOffsetOffset: cursor + 6,
      sealedBlockLengthOffset: cursor + 10,
    });
    cursor += 14;
  }
  return result;
}

export async function replaceDirectory(
  raw: Uint8Array,
  plain: Uint8Array,
  copyOuterHeader = true,
): Promise<Uint8Array> {
  const oldDirectoryLength = readU32(raw, 8);
  const slots = raw.slice(12 + oldDirectoryLength);
  const nextOuter = raw.slice(0, 12);
  const nextDirectoryLength = plain.length + 36;
  writeU32(nextOuter, 8, nextDirectoryLength);
  const nextPlain = plain.slice();
  if (copyOuterHeader) {
    nextPlain.set(nextOuter, 0);
  }
  const sealedDirectory = await sealPbzsBlock(
    nextPlain,
    undefined,
    nonce(0x40),
  );
  return concat([nextOuter, sealedDirectory, slots]);
}

export async function slotOffset(
  raw: Uint8Array,
  index: number,
): Promise<number> {
  const plain = await directoryPlain(raw);
  const count = new DataView(
    raw.buffer,
    raw.byteOffset,
    raw.byteLength,
  ).getUint16(6, true);
  const location = directoryEntryLocations(plain, count)[index]!;
  return 12 + readU32(raw, 8) + readU32(plain, location.relativeOffsetOffset);
}

export function readU32(bytes: Uint8Array, offset: number): number {
  return new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  ).getUint32(offset, true);
}

export function writeU32(
  bytes: Uint8Array,
  offset: number,
  value: number,
): void {
  new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  ).setUint32(offset, value, true);
}

export function concat(parts: readonly Uint8Array[]): Uint8Array {
  const output = new Uint8Array(
    parts.reduce((length, part) => length + part.length, 0),
  );
  let cursor = 0;
  for (const part of parts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  return output;
}

function outerHeader(count: number, firstBlockLength: number): Uint8Array {
  const header = new Uint8Array(12);
  header.set(encoder.encode("PBZS"));
  const view = new DataView(header.buffer);
  view.setUint16(4, 0x0103, true);
  view.setUint16(6, count, true);
  view.setUint32(8, firstBlockLength, true);
  return header;
}

async function makeBlock(
  payload: Uint8Array,
  sealed: 0 | 1,
  blockNonce: Uint8Array,
): Promise<Uint8Array> {
  if (sealed === 1) {
    return sealPbzsBlock(payload, undefined, blockNonce);
  }
  return Uint8Array.from([
    0x50,
    0x42,
    0x5a,
    0x53,
    0x01,
    0x00,
    0x00,
    0x00,
    ...payload,
  ]);
}

function nonce(seed: number): Uint8Array {
  return Uint8Array.from({ length: 12 }, (_, index) => seed + index);
}
