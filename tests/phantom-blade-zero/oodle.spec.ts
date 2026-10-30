import { afterEach, describe, expect, it, vi } from "vitest";

import { decompressOodle } from "@games/phantom-blade-zero/codec/oodle";

const UNCOMPRESSED_VECTOR = Uint8Array.from([
  0x4c,
  0x06,
  ...new TextEncoder().encode("SaveSmith Oodle"),
]);
const EXPECTED = new TextEncoder().encode("SaveSmith Oodle");

describe("Phantom Blade Zero Oodle codec", () => {
  afterEach(() => {
    vi.doUnmock(
      "@games/phantom-blade-zero/codec/oodle/oozextract/oozextract.js",
    );
    vi.resetModules();
  });

  it("decompresses the upstream MIT uncompressed-block vector", async () => {
    await expect(
      decompressOodle(UNCOMPRESSED_VECTOR, EXPECTED.length),
    ).resolves.toEqual(EXPECTED);
  });

  it("rejects an incorrect expected size instead of returning partial output", async () => {
    await expect(
      decompressOodle(UNCOMPRESSED_VECTOR, EXPECTED.length + 1),
    ).rejects.toThrow(/decompress|size|length/i);
    await expect(
      decompressOodle(UNCOMPRESSED_VECTOR, EXPECTED.length - 1),
    ).rejects.toThrow(/decompress|size|length/i);
  });

  it("rejects a damaged Oodle stream", async () => {
    await expect(
      decompressOodle(Uint8Array.from([0xff, 0xff, 0x00]), 8),
    ).rejects.toThrow(/decompress/i);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid expectedSize %s",
    async (expectedSize) => {
      await expect(
        decompressOodle(UNCOMPRESSED_VECTOR, expectedSize),
      ).rejects.toThrow(/expectedSize.*safe non-negative integer/i);
    },
  );

  it("exposes WASM initialization failures", async () => {
    vi.resetModules();
    vi.doMock(
      "@games/phantom-blade-zero/codec/oodle/oozextract/oozextract.js",
      () => ({
        default: vi.fn().mockRejectedValue(new Error("synthetic load failure")),
        Extractor: class {},
      }),
    );

    const { decompressOodle: decompressWithBrokenWasm } = await import(
      "@games/phantom-blade-zero/codec/oodle"
    );

    await expect(
      decompressWithBrokenWasm(UNCOMPRESSED_VECTOR, EXPECTED.length),
    ).rejects.toThrow(/initialize Oodle WASM.*synthetic load failure/i);
  });
});
