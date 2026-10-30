import { ModuleError } from "@sdk/error";

import { decompressOodle } from "./oodle";
import {
  sealPbzsBlock,
  unsealPbzsBlock,
} from "../crypto/pbzsCrypto";
import type {
  PbzsContainer,
  PbzsDirectoryEntry,
  PbzsSlotBlock,
} from "../model/types";

const OUTER_MAGIC = Uint8Array.from([0x50, 0x42, 0x5a, 0x53]);
const OUTER_VERSION = 0x0103;
const OUTER_HEADER_SIZE = 12;
const BLOCK_HEADER_SIZE = 8;
const SEALED_BLOCK_OVERHEAD = 36;
const BLOCK_VERSION = 1;
const MAX_SLOT_COUNT = 1024;
const MAX_U32 = 0xffffffff;
const decoder = new TextDecoder("utf-8", { fatal: true });
const encoder = new TextEncoder();

export async function parsePbzsContainer(
  raw: Uint8Array,
): Promise<PbzsContainer> {
  if (!(raw instanceof Uint8Array) || raw.length < OUTER_HEADER_SIZE) {
    throw invalid("outer header is truncated");
  }

  const outerHeader = raw.slice(0, OUTER_HEADER_SIZE);
  validateMagic(outerHeader, "outer magic");
  const outerView = view(outerHeader);
  if (outerView.getUint16(4, true) !== OUTER_VERSION) {
    throw invalid("outer version");
  }

  const slotCount = outerView.getUint16(6, true);
  if (slotCount < 1 || slotCount > MAX_SLOT_COUNT) {
    throw invalid("slot count");
  }

  const directoryBlockLength = outerView.getUint32(8, true);
  if (directoryBlockLength < SEALED_BLOCK_OVERHEAD) {
    throw invalid("directory block is too short");
  }
  const directoryEnd = checkedAdd(
    OUTER_HEADER_SIZE,
    directoryBlockLength,
    "directory extent",
  );
  if (directoryEnd > raw.length) {
    throw invalid("directory block exceeds file");
  }

  const directoryBlock = raw.slice(OUTER_HEADER_SIZE, directoryEnd);
  validateBlockHeader(directoryBlock, 1, "directory block");
  const directoryPlain = await unsealDirectory(directoryBlock);
  if (
    directoryPlain.length < OUTER_HEADER_SIZE ||
    !equalBytes(
      directoryPlain.subarray(0, OUTER_HEADER_SIZE),
      outerHeader,
    )
  ) {
    throw invalid("directory outer header copy");
  }

  const entries = parseDirectoryEntries(directoryPlain, slotCount);
  const slotRegionLength = raw.length - directoryEnd;
  const slots: PbzsSlotBlock[] = [];
  let expectedOffset = 0;

  for (const entry of entries) {
    if (entry.relativeOffset !== expectedOffset) {
      throw invalid("slot offsets are not contiguous");
    }
    if (entry.sealedBlockLength < BLOCK_HEADER_SIZE) {
      throw invalid("slot block is too short");
    }
    const blockEnd = checkedAdd(
      entry.relativeOffset,
      entry.sealedBlockLength,
      `slot ${entry.name} extent`,
    );
    if (blockEnd > slotRegionLength) {
      throw invalid("slot block exceeds file");
    }

    const absoluteStart = checkedAdd(
      directoryEnd,
      entry.relativeOffset,
      `slot ${entry.name} start`,
    );
    const absoluteEnd = checkedAdd(
      directoryEnd,
      blockEnd,
      `slot ${entry.name} end`,
    );
    const sealedBytes = raw.slice(absoluteStart, absoluteEnd);
    validateBlockHeader(sealedBytes, entry.sealed, `slot ${entry.name}`);
    slots.push({ entry, sealedBytes });
    expectedOffset = blockEnd;
  }

  if (expectedOffset !== slotRegionLength) {
    throw invalid("slot region has trailing bytes");
  }

  return {
    outerHeader,
    directoryBlock,
    slots,
  };
}

export async function readSlotPayload(
  container: PbzsContainer,
  name: string,
): Promise<Uint8Array> {
  const slot = container.slots.find(({ entry }) => entry.name === name);
  if (slot === undefined) {
    throw invalid(`unknown slot ${name}`);
  }
  if (
    slot.entry.compression !== 0 &&
    slot.entry.compression !== 1 &&
    slot.entry.compression !== 2
  ) {
    throw new ModuleError("PBZ_UNSUPPORTED_COMPRESSION", [name]);
  }

  try {
    const encoded = await unsealPbzsBlock(slot.sealedBytes);
    let payload: Uint8Array;
    switch (slot.entry.compression) {
      case 0:
        payload = encoded;
        break;
      case 1:
        payload = await inflate(encoded);
        break;
      case 2:
        payload = await decompressOodle(
          encoded,
          slot.entry.uncompressedSize,
        );
        break;
      default:
        throw new Error("unreachable compression");
    }
    if (payload.length !== slot.entry.uncompressedSize) {
      throw new Error("uncompressed size mismatch");
    }
    return payload.slice();
  } catch (error) {
    if (error instanceof ModuleError && error.code === "PBZ_AUTH_FAILED") {
      throw error;
    }
    throw new ModuleError("PBZ_DECOMPRESSION_FAILED", [name]);
  }
}

export async function serializePbzsContainer(
  container: PbzsContainer,
  dirtyPayloads: ReadonlyMap<string, Uint8Array>,
): Promise<Uint8Array> {
  const names = new Set(container.slots.map(({ entry }) => entry.name));
  for (const [name, payload] of dirtyPayloads) {
    if (!names.has(name)) {
      throw invalid(`unknown dirty slot ${name}`);
    }
    if (!(payload instanceof Uint8Array)) {
      throw invalid(`dirty slot ${name} is not Uint8Array`);
    }
  }

  if (
    container.slots.length < 1 ||
    container.slots.length > MAX_SLOT_COUNT
  ) {
    throw invalid("slot count");
  }

  const rebuilt: PbzsSlotBlock[] = [];
  let relativeOffset = 0;
  for (const slot of container.slots) {
    const dirtyPayload = dirtyPayloads.get(slot.entry.name);
    let sealedBytes: Uint8Array;
    let entry: PbzsDirectoryEntry;
    if (dirtyPayload === undefined) {
      sealedBytes = slot.sealedBytes.slice();
      entry = { ...slot.entry };
    } else {
      const payloadCopy = dirtyPayload.slice();
      const compressed = await deflate(payloadCopy, slot.entry.name);
      sealedBytes = await sealPbzsBlock(compressed);
      entry = {
        ...slot.entry,
        compression: 1,
        sealed: 1,
        uncompressedSize: payloadCopy.length,
      };
    }

    ensureU32(sealedBytes.length, `slot ${entry.name} block length`);
    entry.relativeOffset = relativeOffset;
    entry.sealedBlockLength = sealedBytes.length;
    relativeOffset = checkedU32Add(
      relativeOffset,
      sealedBytes.length,
      "slot region length",
    );
    rebuilt.push({ entry, sealedBytes });
  }

  const encodedNames = validateAndEncodeNames(rebuilt);
  let directoryPlainLength = OUTER_HEADER_SIZE;
  for (const name of encodedNames) {
    directoryPlainLength = checkedU32Add(
      directoryPlainLength,
      16 + name.length,
      "directory plaintext length",
    );
  }
  const directoryBlockLength = checkedU32Add(
    directoryPlainLength,
    SEALED_BLOCK_OVERHEAD,
    "directory block length",
  );
  const outerHeader = makeOuterHeader(
    rebuilt.length,
    directoryBlockLength,
  );
  const directoryPlain = encodeDirectory(
    outerHeader,
    rebuilt,
    encodedNames,
    directoryPlainLength,
  );
  const directoryBlock = await sealPbzsBlock(directoryPlain);
  if (directoryBlock.length !== directoryBlockLength) {
    throw invalid("unexpected directory block length");
  }

  const totalLength = checkedAdd(
    checkedAdd(
      OUTER_HEADER_SIZE,
      directoryBlock.length,
      "container header length",
    ),
    relativeOffset,
    "container length",
  );
  let output: Uint8Array;
  try {
    output = new Uint8Array(totalLength);
  } catch {
    throw invalid("container is too large");
  }
  output.set(outerHeader);
  output.set(directoryBlock, OUTER_HEADER_SIZE);
  let cursor = OUTER_HEADER_SIZE + directoryBlock.length;
  for (const { sealedBytes } of rebuilt) {
    output.set(sealedBytes, cursor);
    cursor += sealedBytes.length;
  }
  return output;
}

function parseDirectoryEntries(
  plain: Uint8Array,
  count: number,
): PbzsDirectoryEntry[] {
  const entries: PbzsDirectoryEntry[] = [];
  const names = new Set<string>();
  const plainView = view(plain);
  let cursor = OUTER_HEADER_SIZE;

  for (let index = 0; index < count; index++) {
    requireRemaining(plain, cursor, 2, "directory item name length");
    const nameLength = plainView.getUint16(cursor, true);
    cursor += 2;
    if (nameLength === 0) {
      throw invalid("empty slot name");
    }
    requireRemaining(
      plain,
      cursor,
      checkedAdd(nameLength, 14, "directory item length"),
      "directory item",
    );
    let name: string;
    try {
      name = decoder.decode(plain.subarray(cursor, cursor + nameLength));
    } catch {
      throw invalid("slot name is not valid UTF-8");
    }
    cursor += nameLength;
    if (names.has(name)) {
      throw invalid("duplicate slot name");
    }
    names.add(name);

    const compression = plain[cursor++]!;
    const sealed = plain[cursor++]!;
    if (sealed !== 0 && sealed !== 1) {
      throw invalid("directory sealed flag");
    }
    const uncompressedSize = plainView.getUint32(cursor, true);
    cursor += 4;
    const relativeOffset = plainView.getUint32(cursor, true);
    cursor += 4;
    const sealedBlockLength = plainView.getUint32(cursor, true);
    cursor += 4;
    entries.push({
      name,
      compression,
      sealed,
      uncompressedSize,
      relativeOffset,
      sealedBlockLength,
    });
  }

  if (cursor !== plain.length) {
    throw invalid("directory has trailing bytes");
  }
  return entries;
}

async function unsealDirectory(block: Uint8Array): Promise<Uint8Array> {
  try {
    return await unsealPbzsBlock(block);
  } catch (error) {
    if (error instanceof ModuleError && error.code === "PBZ_AUTH_FAILED") {
      throw error;
    }
    throw invalid("directory block");
  }
}

function validateBlockHeader(
  block: Uint8Array,
  expectedSealed: 0 | 1,
  label: string,
): void {
  if (block.length < BLOCK_HEADER_SIZE) {
    throw invalid(`${label} header is truncated`);
  }
  validateMagic(block, `${label} magic`);
  if (block[4] !== BLOCK_VERSION) {
    throw invalid(`${label} version`);
  }
  const sealed = block[5];
  if (sealed !== 0 && sealed !== 1) {
    throw invalid(`${label} sealed flag`);
  }
  if (sealed !== expectedSealed) {
    throw invalid(`${label} sealed flag mismatch`);
  }
  if (block[6] !== 0 || block[7] !== 0) {
    throw invalid(`${label} reserved bytes`);
  }
}

function validateMagic(bytes: Uint8Array, reason: string): void {
  for (let index = 0; index < OUTER_MAGIC.length; index++) {
    if (bytes[index] !== OUTER_MAGIC[index]) {
      throw invalid(reason);
    }
  }
}

function validateAndEncodeNames(
  slots: readonly PbzsSlotBlock[],
): Uint8Array[] {
  const names = new Set<string>();
  return slots.map(({ entry }) => {
    if (entry.name.length === 0 || names.has(entry.name)) {
      throw invalid("slot names must be non-empty and unique");
    }
    names.add(entry.name);
    const encoded = encoder.encode(entry.name);
    if (encoded.length === 0 || encoded.length > 0xffff) {
      throw invalid(`slot name ${entry.name} is too long`);
    }
    if (
      entry.sealed !== 0 &&
      entry.sealed !== 1
    ) {
      throw invalid(`slot ${entry.name} sealed flag`);
    }
    ensureU32(entry.uncompressedSize, `slot ${entry.name} size`);
    return encoded;
  });
}

function encodeDirectory(
  outerHeader: Uint8Array,
  slots: readonly PbzsSlotBlock[],
  encodedNames: readonly Uint8Array[],
  length: number,
): Uint8Array {
  const plain = new Uint8Array(length);
  plain.set(outerHeader);
  const plainView = view(plain);
  let cursor = OUTER_HEADER_SIZE;
  for (const [index, { entry }] of slots.entries()) {
    const name = encodedNames[index]!;
    plainView.setUint16(cursor, name.length, true);
    cursor += 2;
    plain.set(name, cursor);
    cursor += name.length;
    plain[cursor++] = entry.compression;
    plain[cursor++] = entry.sealed;
    plainView.setUint32(cursor, entry.uncompressedSize, true);
    cursor += 4;
    plainView.setUint32(cursor, entry.relativeOffset, true);
    cursor += 4;
    plainView.setUint32(cursor, entry.sealedBlockLength, true);
    cursor += 4;
  }
  return plain;
}

function makeOuterHeader(
  slotCount: number,
  directoryBlockLength: number,
): Uint8Array {
  const header = new Uint8Array(OUTER_HEADER_SIZE);
  header.set(OUTER_MAGIC);
  const headerView = view(header);
  headerView.setUint16(4, OUTER_VERSION, true);
  headerView.setUint16(6, slotCount, true);
  headerView.setUint32(8, directoryBlockLength, true);
  return header;
}

async function inflate(payload: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(payload)])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function deflate(
  payload: Uint8Array,
  slotName: string,
): Promise<Uint8Array> {
  try {
    const stream = new Blob([new Uint8Array(payload)])
      .stream()
      .pipeThrough(new CompressionStream("deflate"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    throw new ModuleError("PBZ_DECOMPRESSION_FAILED", [slotName]);
  }
}

function requireRemaining(
  bytes: Uint8Array,
  offset: number,
  length: number,
  reason: string,
): void {
  const end = checkedAdd(offset, length, reason);
  if (end > bytes.length) {
    throw invalid(`${reason} is truncated`);
  }
}

function checkedAdd(left: number, right: number, reason: string): number {
  const result = left + right;
  if (!Number.isSafeInteger(result) || result < 0) {
    throw invalid(`${reason} overflows`);
  }
  return result;
}

function checkedU32Add(
  left: number,
  right: number,
  reason: string,
): number {
  const result = checkedAdd(left, right, reason);
  ensureU32(result, reason);
  return result;
}

function ensureU32(value: number, reason: string): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_U32) {
    throw invalid(`${reason} is not u32`);
  }
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function invalid(reason: string): ModuleError {
  return new ModuleError("PBZ_INVALID_CONTAINER", [reason]);
}

export type {
  PbzsCompression,
  PbzsContainer,
  PbzsDirectoryEntry,
  PbzsSlotBlock,
} from "../model/types";
