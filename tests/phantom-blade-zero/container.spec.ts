import { describe, expect, it } from "vitest";

import {
  parsePbzsContainer,
  readSlotPayload,
  serializePbzsContainer,
} from "@games/phantom-blade-zero/codec/container";
import { ModuleError } from "@sdk/error";

import {
  OODLE_COMPRESSED,
  OODLE_PLAIN,
  concat,
  deflate,
  directoryEntryLocations,
  directoryPlain,
  makePbzsFixture,
  readU32,
  replaceDirectory,
  slotOffset,
  writeU32,
} from "./fixtures";

const encoder = new TextEncoder();

async function expectCode(
  promise: Promise<unknown>,
  code: string,
): Promise<ModuleError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ModuleError);
    expect((error as ModuleError).code).toBe(code);
    return error as ModuleError;
  }
  throw new Error(`Expected ModuleError(${code})`);
}

async function standardFixture(): Promise<Uint8Array> {
  const zlibPlain = encoder.encode("zlib slot");
  return makePbzsFixture([
    { name: "raw", compression: 0, payload: encoder.encode("raw slot") },
    {
      name: "zlib",
      compression: 1,
      payload: await deflate(zlibPlain),
      uncompressedSize: zlibPlain.length,
    },
    {
      name: "oodle",
      compression: 2,
      payload: OODLE_COMPRESSED,
      uncompressedSize: OODLE_PLAIN.length,
    },
  ]);
}

describe("PBZS v3 container", () => {
  it("parses named slots and isolates returned bytes from input mutation", async () => {
    const raw = await standardFixture();
    const container = await parsePbzsContainer(raw);
    const originalHeader = container.outerHeader.slice();
    const originalSlot = container.slots[0]!.sealedBytes.slice();

    raw.fill(0);

    expect(container.outerHeader).toEqual(originalHeader);
    expect(container.slots.map(({ entry }) => entry.name)).toEqual([
      "raw",
      "zlib",
      "oodle",
    ]);
    expect(container.slots[0]!.sealedBytes).toEqual(originalSlot);
  });

  it("dispatches raw, zlib, and Oodle payloads", async () => {
    const container = await parsePbzsContainer(await standardFixture());

    await expect(readSlotPayload(container, "raw")).resolves.toEqual(
      encoder.encode("raw slot"),
    );
    await expect(readSlotPayload(container, "zlib")).resolves.toEqual(
      encoder.encode("zlib slot"),
    );
    await expect(readSlotPayload(container, "oodle")).resolves.toEqual(
      OODLE_PLAIN,
    );
  });

  it("round-trips multiple slots semantically", async () => {
    const parsed = await parsePbzsContainer(await standardFixture());
    const serialized = await serializePbzsContainer(parsed, new Map());
    const reparsed = await parsePbzsContainer(serialized);

    expect(reparsed.slots.map(({ entry }) => entry.name)).toEqual([
      "raw",
      "zlib",
      "oodle",
    ]);
    await expect(readSlotPayload(reparsed, "raw")).resolves.toEqual(
      encoder.encode("raw slot"),
    );
    await expect(readSlotPayload(reparsed, "zlib")).resolves.toEqual(
      encoder.encode("zlib slot"),
    );
    await expect(readSlotPayload(reparsed, "oodle")).resolves.toEqual(
      OODLE_PLAIN,
    );
  });

  it("rewrites only a dirty slot as sealed zlib", async () => {
    const parsed = await parsePbzsContainer(await standardFixture());
    const untouched = parsed.slots.map(({ sealedBytes }) => sealedBytes.slice());
    const replacement = encoder.encode("new raw value");
    const serialized = await serializePbzsContainer(
      parsed,
      new Map([["raw", replacement]]),
    );
    const reparsed = await parsePbzsContainer(serialized);

    expect(reparsed.slots[0]!.entry).toMatchObject({
      name: "raw",
      compression: 1,
      sealed: 1,
      uncompressedSize: replacement.length,
      relativeOffset: 0,
    });
    await expect(readSlotPayload(reparsed, "raw")).resolves.toEqual(replacement);
    expect(reparsed.slots[1]!.sealedBytes).toEqual(untouched[1]);
    expect(reparsed.slots[2]!.sealedBytes).toEqual(untouched[2]);
  });

  it("re-seals the directory but passes every slot through when nothing is dirty", async () => {
    const parsed = await parsePbzsContainer(await standardFixture());
    const serialized = await serializePbzsContainer(parsed, new Map());
    const reparsed = await parsePbzsContainer(serialized);

    expect(reparsed.directoryBlock).not.toEqual(parsed.directoryBlock);
    expect(reparsed.slots.map(({ sealedBytes }) => sealedBytes)).toEqual(
      parsed.slots.map(({ sealedBytes }) => sealedBytes),
    );
  });

  it("preserves unknown compression but refuses to read it", async () => {
    const raw = await makePbzsFixture([
      { name: "future", compression: 77, payload: encoder.encode("opaque") },
    ]);
    const parsed = await parsePbzsContainer(raw);
    expect(parsed.slots[0]!.entry.compression).toBe(77);
    await expectCode(
      readSlotPayload(parsed, "future"),
      "PBZ_UNSUPPORTED_COMPRESSION",
    );

    const reparsed = await parsePbzsContainer(
      await serializePbzsContainer(parsed, new Map()),
    );
    expect(reparsed.slots[0]!.entry.compression).toBe(77);
    expect(reparsed.slots[0]!.sealedBytes).toEqual(
      parsed.slots[0]!.sealedBytes,
    );
  });

  it("rejects an unknown dirty name", async () => {
    const parsed = await parsePbzsContainer(await standardFixture());
    await expectCode(
      serializePbzsContainer(
        parsed,
        new Map([["missing", encoder.encode("value")]]),
      ),
      "PBZ_INVALID_CONTAINER",
    );
  });

  it.each([
    ["magic", 0, 0x00],
    ["version", 4, 0x02],
  ])("rejects an invalid outer %s", async (_field, offset, value) => {
    const raw = await standardFixture();
    raw[offset] = value;
    await expectCode(parsePbzsContainer(raw), "PBZ_INVALID_CONTAINER");
  });

  it.each([0, 1025])("rejects invalid slot count %s", async (count) => {
    const raw = await standardFixture();
    new DataView(raw.buffer).setUint16(6, count, true);
    await expectCode(parsePbzsContainer(raw), "PBZ_INVALID_CONTAINER");
  });

  it.each([35, 0xffffffff])(
    "rejects invalid directory block length %s",
    async (length) => {
      const raw = await standardFixture();
      writeU32(raw, 8, length);
      await expectCode(parsePbzsContainer(raw), "PBZ_INVALID_CONTAINER");
    },
  );

  it("preserves directory authentication failures", async () => {
    const raw = await standardFixture();
    raw[32] ^= 0x80;
    await expectCode(parsePbzsContainer(raw), "PBZ_AUTH_FAILED");
  });

  it("rejects a directory outer-header copy mismatch", async () => {
    const raw = await standardFixture();
    const plain = await directoryPlain(raw);
    plain[0] ^= 0x20;
    await expectCode(
      parsePbzsContainer(await replaceDirectory(raw, plain, false)),
      "PBZ_INVALID_CONTAINER",
    );
  });

  it.each([
    ["truncated item", (plain: Uint8Array) => {
      new DataView(plain.buffer).setUint16(12, 0xffff, true);
    }],
    ["invalid UTF-8", (plain: Uint8Array) => {
      plain[14] = 0xff;
    }],
    ["empty name", (plain: Uint8Array) => {
      new DataView(plain.buffer).setUint16(12, 0, true);
    }],
    ["duplicate name", (plain: Uint8Array) => {
      const locations = directoryEntryLocations(plain, 3);
      plain.set(
        plain.slice(
          locations[0]!.nameOffset,
          locations[0]!.compressionOffset,
        ),
        locations[1]!.nameOffset,
      );
    }],
  ])("rejects a directory with %s", async (_name, mutate) => {
    const raw = await makePbzsFixture([
      { name: "aa", compression: 0, payload: Uint8Array.of(1) },
      { name: "bb", compression: 0, payload: Uint8Array.of(2) },
      { name: "cc", compression: 0, payload: Uint8Array.of(3) },
    ]);
    const plain = await directoryPlain(raw);
    mutate(plain);
    await expectCode(
      parsePbzsContainer(await replaceDirectory(raw, plain)),
      "PBZ_INVALID_CONTAINER",
    );
  });

  it.each([
    ["non-zero first offset", 0, 1],
    ["out-of-order offset", 1, 0],
    ["overlap", 1, 1],
    ["hole", 1, 100],
  ])("rejects %s", async (_name, index, offset) => {
    const raw = await standardFixture();
    const plain = await directoryPlain(raw);
    const locations = directoryEntryLocations(plain, 3);
    writeU32(plain, locations[index]!.relativeOffsetOffset, offset);
    await expectCode(
      parsePbzsContainer(await replaceDirectory(raw, plain)),
      "PBZ_INVALID_CONTAINER",
    );
  });

  it("rejects a block extent whose u32 addition exceeds the file", async () => {
    const raw = await standardFixture();
    const plain = await directoryPlain(raw);
    const location = directoryEntryLocations(plain, 3)[0]!;
    writeU32(plain, location.sealedBlockLengthOffset, 0xffffffff);
    await expectCode(
      parsePbzsContainer(await replaceDirectory(raw, plain)),
      "PBZ_INVALID_CONTAINER",
    );
  });

  it("rejects trailing file bytes and trailing directory bytes", async () => {
    const raw = await standardFixture();
    await expectCode(
      parsePbzsContainer(concat([raw, Uint8Array.of(0)])),
      "PBZ_INVALID_CONTAINER",
    );

    const plain = await directoryPlain(raw);
    await expectCode(
      parsePbzsContainer(
        await replaceDirectory(raw, concat([plain, Uint8Array.of(0)])),
      ),
      "PBZ_INVALID_CONTAINER",
    );
  });

  it.each([
    ["magic", 0, 0x00],
    ["version", 4, 0x02],
    ["reserved", 6, 0x01],
    ["sealed flag", 5, 0x02],
  ])("rejects invalid slot block %s", async (_name, delta, value) => {
    const raw = await standardFixture();
    raw[(await slotOffset(raw, 0)) + delta] = value;
    await expectCode(parsePbzsContainer(raw), "PBZ_INVALID_CONTAINER");
  });

  it("rejects a slot block shorter than its header", async () => {
    const raw = await standardFixture();
    const plain = await directoryPlain(raw);
    const locations = directoryEntryLocations(plain, 3);
    writeU32(plain, locations[0]!.sealedBlockLengthOffset, 7);
    writeU32(plain, locations[1]!.relativeOffsetOffset, 7);
    await expectCode(
      parsePbzsContainer(await replaceDirectory(raw, plain)),
      "PBZ_INVALID_CONTAINER",
    );
  });

  it("rejects directory and block sealed-flag disagreement", async () => {
    const raw = await standardFixture();
    const plain = await directoryPlain(raw);
    plain[directoryEntryLocations(plain, 3)[0]!.sealedOffset] = 0;
    await expectCode(
      parsePbzsContainer(await replaceDirectory(raw, plain)),
      "PBZ_INVALID_CONTAINER",
    );
  });

  it.each([
    ["raw length", 0, encoder.encode("abc"), 4],
    ["zlib length", 1, encoder.encode("abc"), 4],
    ["bad zlib", 1, Uint8Array.of(1, 2, 3), 3],
    ["Oodle length", 2, OODLE_COMPRESSED, OODLE_PLAIN.length + 1],
    ["bad Oodle", 2, Uint8Array.of(0xff, 0xff, 0), 8],
  ])(
    "maps %s failure to PBZ_DECOMPRESSION_FAILED",
    async (_name, compression, payload, uncompressedSize) => {
      const encodedPayload =
        _name === "zlib length" ? await deflate(payload) : payload;
      const raw = await makePbzsFixture([
        {
          name: "bad",
          compression,
          payload: encodedPayload,
          uncompressedSize,
        },
      ]);
      const parsed = await parsePbzsContainer(raw);
      await expectCode(
        readSlotPayload(parsed, "bad"),
        "PBZ_DECOMPRESSION_FAILED",
      );
    },
  );

  it("preserves a slot authentication failure", async () => {
    const raw = await standardFixture();
    const offset = await slotOffset(raw, 0);
    raw[offset + 20] ^= 0x80;
    const parsed = await parsePbzsContainer(raw);
    await expectCode(readSlotPayload(parsed, "raw"), "PBZ_AUTH_FAILED");
  });

  it("rejects a missing slot name on read", async () => {
    const parsed = await parsePbzsContainer(await standardFixture());
    await expectCode(
      readSlotPayload(parsed, "missing"),
      "PBZ_INVALID_CONTAINER",
    );
  });

  it("recomputes offsets and lengths after dirty block size changes", async () => {
    const parsed = await parsePbzsContainer(await standardFixture());
    const serialized = await serializePbzsContainer(
      parsed,
      new Map([["raw", new Uint8Array(10_000).fill(0x41)]]),
    );
    const reparsed = await parsePbzsContainer(serialized);

    for (let index = 1; index < reparsed.slots.length; index++) {
      const previous = reparsed.slots[index - 1]!;
      expect(reparsed.slots[index]!.entry.relativeOffset).toBe(
        previous.entry.relativeOffset + previous.entry.sealedBlockLength,
      );
    }
    const last = reparsed.slots.at(-1)!;
    expect(
      12 +
        readU32(serialized, 8) +
        last.entry.relativeOffset +
        last.entry.sealedBlockLength,
    ).toBe(serialized.length);
  });
});
