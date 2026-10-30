import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import { decompressOodle } from "@games/phantom-blade-zero/codec/oodle";

const UNCOMPRESSED_VECTOR = Uint8Array.from([
  0x4c,
  0x06,
  ...new TextEncoder().encode("SaveSmith Oodle"),
]);
const EXPECTED = new TextEncoder().encode("SaveSmith Oodle");

function lzb16Block(commands: number[]): Uint8Array {
  const size = commands.length - 1;
  return Uint8Array.from([0x8c, 0x02, size >> 8, size & 0xff, ...commands]);
}

describe("Phantom Blade Zero Oodle codec", () => {
  afterEach(() => {
    vi.doUnmock(
      "@games/phantom-blade-zero/codec/oodle/oozextract/oozextract.js",
    );
    vi.doUnmock(
      "@games/phantom-blade-zero/codec/oodle/oozextract/oozextract_bg.wasm?inline",
    );
    vi.resetModules();
  });

  it("decompresses the upstream MIT uncompressed-block vector", async () => {
    await expect(
      decompressOodle(UNCOMPRESSED_VECTOR, EXPECTED.length),
    ).resolves.toEqual(EXPECTED);
  });

  it("decompresses an upstream-derived LZB16 literal and back-reference vector", async () => {
    // First command sequence from oozextract 0.5.7's lzb16_commands test:
    // three literals, then a length-five match at distance two.
    const compressed = lzb16Block([
      0x13,
      "a".charCodeAt(0),
      "b".charCodeAt(0),
      "c".charCodeAt(0),
      0x02,
      0x00,
    ]);

    await expect(decompressOodle(compressed, 8)).resolves.toEqual(
      new TextEncoder().encode("abcbcbcb"),
    );
  });

  it("passes decoded WASM bytes to init instead of a data URL", async () => {
    vi.resetModules();
    const init = vi.fn().mockResolvedValue({});
    const extract = vi.fn().mockReturnValue(EXPECTED);
    vi.doMock(
      "@games/phantom-blade-zero/codec/oodle/oozextract/oozextract.js",
      () => ({
        default: init,
        Extractor: {
          new: vi.fn(() => ({ extract, free: vi.fn() })),
        },
      }),
    );

    const { decompressOodle: decompressWithObservedInit } = await import(
      "@games/phantom-blade-zero/codec/oodle"
    );
    await decompressWithObservedInit(UNCOMPRESSED_VECTOR, EXPECTED.length);

    const initInput = init.mock.calls[0][0].module_or_path;
    expect(initInput).toBeInstanceOf(Uint8Array);
    expect(Array.from(initInput.slice(0, 4))).toEqual([0x00, 0x61, 0x73, 0x6d]);
    expect(extract).toHaveBeenCalledOnce();
    expect(extract).toHaveBeenCalledWith(UNCOMPRESSED_VECTOR, EXPECTED.length);
  });

  it("ships glue without a fallback URL that Vite can emit twice", () => {
    const glue = readFileSync(
      new URL(
        "../../src/games/phantom-blade-zero/codec/oodle/oozextract/oozextract.js",
        import.meta.url,
      ),
      "utf8",
    );

    expect(glue).not.toContain("new URL('oozextract_bg.wasm', import.meta.url)");
  });

  it("rejects an oversized expected size instead of returning short output", async () => {
    await expect(
      decompressOodle(UNCOMPRESSED_VECTOR, EXPECTED.length + 1),
    ).rejects.toThrow(/decompress|size|length/i);
  });

  it("rejects when the extractor returns fewer bytes than expected", async () => {
    vi.resetModules();
    const extract = vi.fn().mockReturnValue(EXPECTED.slice(0, -1));
    vi.doMock(
      "@games/phantom-blade-zero/codec/oodle/oozextract/oozextract.js",
      () => ({
        default: vi.fn().mockResolvedValue({}),
        Extractor: {
          new: vi.fn(() => ({ extract, free: vi.fn() })),
        },
      }),
    );

    const { decompressOodle: decompressWithShortOutput } = await import(
      "@games/phantom-blade-zero/codec/oodle"
    );

    await expect(
      decompressWithShortOutput(UNCOMPRESSED_VECTOR, EXPECTED.length),
    ).rejects.toThrow(/length mismatch: expected \d+, got \d+/i);
  });

  it("rejects an over-limit expected size before calling the extractor", async () => {
    vi.resetModules();
    const extract = vi.fn();
    vi.doMock(
      "@games/phantom-blade-zero/codec/oodle/oozextract/oozextract.js",
      () => ({
        default: vi.fn().mockResolvedValue({}),
        Extractor: {
          new: vi.fn(() => ({ extract, free: vi.fn() })),
        },
      }),
    );

    const { decompressOodle: decompressWithObservedExtractor } = await import(
      "@games/phantom-blade-zero/codec/oodle"
    );

    await expect(
      decompressWithObservedExtractor(
        UNCOMPRESSED_VECTOR,
        16 * 1024 * 1024 + 1,
      ),
    ).rejects.toThrow(/expectedSize.*16 MiB|slot limit/i);
    expect(extract).not.toHaveBeenCalled();
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

  it("wraps synchronous inline-WASM decode failures with their cause", async () => {
    vi.resetModules();
    const init = vi.fn();
    vi.doMock(
      "@games/phantom-blade-zero/codec/oodle/oozextract/oozextract.js",
      () => ({
        default: init,
        Extractor: class {},
      }),
    );
    vi.doMock(
      "@games/phantom-blade-zero/codec/oodle/oozextract/oozextract_bg.wasm?inline",
      () => ({
        default: "data:application/wasm;base64,%%%",
      }),
    );

    const { decompressOodle: decompressWithInvalidInlineWasm } = await import(
      "@games/phantom-blade-zero/codec/oodle"
    );
    const failure = await decompressWithInvalidInlineWasm(
      UNCOMPRESSED_VECTOR,
      EXPECTED.length,
    ).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toMatch(
      /Failed to initialize Oodle WASM/i,
    );
    expect((failure as Error & { cause?: unknown }).cause).toBeInstanceOf(
      Error,
    );
    expect(init).not.toHaveBeenCalled();
  });
});
