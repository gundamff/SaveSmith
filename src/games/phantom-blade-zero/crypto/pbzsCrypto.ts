import { ModuleError } from "@sdk/error";

const INTERNAL_PBZS_MAGIC = Uint8Array.from([0x50, 0x42, 0x5a, 0x53]);

export const PBZS_MAGIC = INTERNAL_PBZS_MAGIC.slice();
export const PBZS_VERSION = 1;
export const PBZS_BUILD = 26266538;
export const PBZS_BUILD_KEY_SHA256 =
  "65b75c306a77eb2df3ed5a7e6b3f8dbef360f6abefa74c465196cfa19af9637c";
export const PBZS_BUILD_KEY = hex(
  "15a1fe0f55e0eb298e7c9461548351696a2a0700ed2d17ba1f871457e8f93e2d",
);

const HEADER_SIZE = 8;
const NONCE_SIZE = 12;
const TAG_SIZE = 16;
const SEALED_OVERHEAD = HEADER_SIZE + NONCE_SIZE + TAG_SIZE;
const DEFAULT_KEY = PBZS_BUILD_KEY.slice();

let defaultCryptoKey: Promise<CryptoKey> | undefined;

function hex(value: string): Uint8Array {
  return Uint8Array.from(value.match(/../g) ?? [], (byte) =>
    Number.parseInt(byte, 16),
  );
}

function invalid(reason: string): ModuleError {
  return new ModuleError("PBZ_INVALID_BLOCK", [reason]);
}

function validateKey(key: Uint8Array): void {
  if (key.length !== 32) {
    throw invalid("key must be 32 bytes");
  }
}

function validateNonce(nonce: Uint8Array): void {
  if (nonce.length !== NONCE_SIZE) {
    throw invalid("nonce must be 12 bytes");
  }
}

function importAesKey(key?: Uint8Array): Promise<CryptoKey> {
  if (key !== undefined) {
    validateKey(key);
    return globalThis.crypto.subtle.importKey(
      "raw",
      new Uint8Array(key),
      "AES-GCM",
      false,
      keyUsages,
    );
  }

  defaultCryptoKey ??= globalThis.crypto.subtle.importKey(
    "raw",
    new Uint8Array(DEFAULT_KEY),
    "AES-GCM",
    false,
    keyUsages,
  );
  return defaultCryptoKey;
}

const keyUsages: KeyUsage[] = ["encrypt", "decrypt"];

function validateHeader(block: Uint8Array): number {
  if (block.length < HEADER_SIZE) {
    throw invalid("header is truncated");
  }
  for (let i = 0; i < INTERNAL_PBZS_MAGIC.length; i++) {
    if (block[i] !== INTERNAL_PBZS_MAGIC[i]) {
      throw invalid("magic");
    }
  }
  if (block[4] !== PBZS_VERSION) {
    throw invalid("version");
  }
  const sealed = block[5]!;
  if (sealed !== 0 && sealed !== 1) {
    throw invalid("sealed flag");
  }
  if (block[6] !== 0 || block[7] !== 0) {
    throw invalid("reserved");
  }
  return sealed;
}

export async function unsealPbzsBlock(
  block: Uint8Array,
  key?: Uint8Array,
): Promise<Uint8Array> {
  const sealed = validateHeader(block);
  if (key !== undefined) {
    validateKey(key);
  }
  if (sealed === 0) {
    return block.slice(HEADER_SIZE);
  }
  if (block.length < SEALED_OVERHEAD) {
    throw invalid("sealed block is truncated");
  }

  const nonce = block.slice(HEADER_SIZE, HEADER_SIZE + NONCE_SIZE);
  const tag = block.slice(HEADER_SIZE + NONCE_SIZE, SEALED_OVERHEAD);
  const ciphertext = block.slice(SEALED_OVERHEAD);
  const webCryptoPayload = new Uint8Array(ciphertext.length + TAG_SIZE);
  webCryptoPayload.set(ciphertext);
  webCryptoPayload.set(tag, ciphertext.length);

  try {
    const cryptoKey = await importAesKey(key);
    const plain = await globalThis.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: nonce, tagLength: TAG_SIZE * 8 },
      cryptoKey,
      webCryptoPayload,
    );
    return new Uint8Array(plain);
  } catch (error) {
    if (error instanceof ModuleError) {
      throw error;
    }
    throw new ModuleError("PBZ_AUTH_FAILED");
  }
}

export async function sealPbzsBlock(
  plain: Uint8Array,
  key?: Uint8Array,
  nonce?: Uint8Array,
): Promise<Uint8Array> {
  const actualNonce =
    nonce === undefined
      ? globalThis.crypto.getRandomValues(new Uint8Array(NONCE_SIZE))
      : new Uint8Array(nonce);
  validateNonce(actualNonce);

  try {
    const cryptoKey = await importAesKey(key);
    const encrypted = new Uint8Array(
      await globalThis.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: actualNonce, tagLength: TAG_SIZE * 8 },
        cryptoKey,
        new Uint8Array(plain),
      ),
    );
    const ciphertextLength = encrypted.length - TAG_SIZE;
    const block = new Uint8Array(SEALED_OVERHEAD + ciphertextLength);
    block.set(INTERNAL_PBZS_MAGIC);
    block[4] = PBZS_VERSION;
    block[5] = 1;
    block.set(actualNonce, HEADER_SIZE);
    block.set(encrypted.subarray(ciphertextLength), HEADER_SIZE + NONCE_SIZE);
    block.set(encrypted.subarray(0, ciphertextLength), SEALED_OVERHEAD);
    return block;
  } catch (error) {
    if (error instanceof ModuleError) {
      throw error;
    }
    throw invalid("encryption failed");
  }
}
