import { describe, expect, it } from "vitest";

import {
  PBZS_BUILD_KEY,
  sealPbzsBlock,
  unsealPbzsBlock,
} from "@games/phantom-blade-zero/crypto/pbzsCrypto";
import { ModuleError } from "@sdk/error";

const encoder = new TextEncoder();
const DEFAULT_KEY = hex(
  "15a1fe0f55e0eb298e7c9461548351696a2a0700ed2d17ba1f871457e8f93e2d",
);
const FIXED_NONCE = hex("000102030405060708090a0b");
const FIXED_PLAIN = hex("53617665536d6974682050425a5320766563746f72");
const FIXED_BLOCK = hex(
  "50425a5301010000000102030405060708090a0b" +
    "4cc8851c9c07f33d25285d3a4c8921b0" +
    "1bd64d41286b136242da34358f00975f7745617b25",
);

function hex(value: string): Uint8Array {
  return Uint8Array.from(value.match(/../g) ?? [], (byte) =>
    Number.parseInt(byte, 16),
  );
}

function plainBlock(plain: Uint8Array): Uint8Array {
  return Uint8Array.from([
    0x50,
    0x42,
    0x5a,
    0x53,
    0x01,
    0x00,
    0x00,
    0x00,
    ...plain,
  ]);
}

async function expectModuleError(
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

describe("PBZS AES-256-GCM blocks", () => {
  it("matches the independently generated fixed key and nonce vector", async () => {
    expect(PBZS_BUILD_KEY).toEqual(DEFAULT_KEY);
    await expect(
      sealPbzsBlock(FIXED_PLAIN, DEFAULT_KEY, FIXED_NONCE),
    ).resolves.toEqual(FIXED_BLOCK);
    await expect(unsealPbzsBlock(FIXED_BLOCK)).resolves.toEqual(FIXED_PLAIN);
  });

  it("round-trips synthetic binary plaintext", async () => {
    const plain = Uint8Array.from([0x00, 0xff, 0x42, 0x00, 0x80]);
    const sealed = await sealPbzsBlock(plain, undefined, FIXED_NONCE);

    await expect(unsealPbzsBlock(sealed)).resolves.toEqual(plain);
  });

  it("accepts validated sealed=0 plaintext and returns a copy", async () => {
    const block = plainBlock(encoder.encode("plain PBZS"));
    const result = await unsealPbzsBlock(block);

    expect(result).toEqual(encoder.encode("plain PBZS"));
    expect(result.buffer).not.toBe(block.buffer);
    block[8] = 0xff;
    expect(result[0]).toBe("p".charCodeAt(0));
  });

  it("uses a fresh random nonce for each production seal", async () => {
    const plain = encoder.encode("same plaintext");
    const first = await sealPbzsBlock(plain);
    const second = await sealPbzsBlock(plain);

    expect(first.slice(8, 20)).not.toEqual(second.slice(8, 20));
    expect(first).not.toEqual(second);
  });

  it.each([
    ["short", new Uint8Array(31)],
    ["long", new Uint8Array(33)],
  ])("rejects a %s explicit key", async (_name, key) => {
    const error = await expectModuleError(
      sealPbzsBlock(FIXED_PLAIN, key, FIXED_NONCE),
      "PBZ_INVALID_BLOCK",
    );
    expect(error.args[0]).toMatch(/key/i);
  });

  it("validates an explicit key even for a sealed=0 block", async () => {
    const error = await expectModuleError(
      unsealPbzsBlock(plainBlock(FIXED_PLAIN), new Uint8Array(31)),
      "PBZ_INVALID_BLOCK",
    );
    expect(error.args[0]).toMatch(/key/i);
  });

  it.each([
    ["short", new Uint8Array(11)],
    ["long", new Uint8Array(13)],
  ])("rejects a %s explicit nonce", async (_name, nonce) => {
    const error = await expectModuleError(
      sealPbzsBlock(FIXED_PLAIN, DEFAULT_KEY, nonce),
      "PBZ_INVALID_BLOCK",
    );
    expect(error.args[0]).toMatch(/nonce/i);
  });

  it.each([
    ["magic", 0, 0x00],
    ["version", 4, 0x02],
    ["sealed flag", 5, 0x02],
    ["reserved low byte", 6, 0x01],
    ["reserved high byte", 7, 0x01],
  ])("rejects an invalid %s field", async (_name, offset, value) => {
    const damaged = FIXED_BLOCK.slice();
    damaged[offset] = value;

    await expectModuleError(unsealPbzsBlock(damaged), "PBZ_INVALID_BLOCK");
  });

  it.each([
    ["header", new Uint8Array(7)],
    ["nonce or tag", FIXED_BLOCK.slice(0, 35)],
  ])("rejects a block with a short %s", async (_name, block) => {
    await expectModuleError(unsealPbzsBlock(block), "PBZ_INVALID_BLOCK");
  });

  it("maps a damaged authentication tag to PBZ_AUTH_FAILED", async () => {
    const damaged = FIXED_BLOCK.slice();
    damaged[20] ^= 0x80;

    await expectModuleError(unsealPbzsBlock(damaged), "PBZ_AUTH_FAILED");
  });

  it("maps ciphertext tampering to PBZ_AUTH_FAILED", async () => {
    const damaged = FIXED_BLOCK.slice();
    damaged[36] ^= 0x80;

    await expectModuleError(unsealPbzsBlock(damaged), "PBZ_AUTH_FAILED");
  });

  it("maps a wrong key to PBZ_AUTH_FAILED", async () => {
    const wrongKey = DEFAULT_KEY.slice();
    wrongKey[0] ^= 0x80;

    await expectModuleError(
      unsealPbzsBlock(FIXED_BLOCK, wrongKey),
      "PBZ_AUTH_FAILED",
    );
  });

  it("supports authenticated empty plaintext", async () => {
    const sealed = await sealPbzsBlock(new Uint8Array(), undefined, FIXED_NONCE);

    expect(sealed).toHaveLength(36);
    await expect(unsealPbzsBlock(sealed)).resolves.toEqual(new Uint8Array());
  });
});
