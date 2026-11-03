import initOozextract, {
  Extractor,
} from "./oozextract/oozextract.js";
import wasmUrl from "./oozextract/oozextract_bg.wasm?inline";
import { MAX_PBZS_SLOT_UNCOMPRESSED_SIZE } from "../limits";

let initialization: Promise<void> | undefined;

function decodeInlineWasm(dataUrl: string): Uint8Array {
  const separator = dataUrl.indexOf(",");
  if (
    separator < 0 ||
    !dataUrl.slice(0, separator).endsWith(";base64")
  ) {
    throw new Error("Bundled Oodle WASM is not a base64 data URL");
  }

  const binary = atob(dataUrl.slice(separator + 1));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function initializeWasm(): Promise<void> {
  // A rejected initialization remains cached: repeated calls must report the
  // same terminal load failure rather than retrying an invalid bundled module.
  initialization ??= Promise.resolve()
    .then(() =>
      initOozextract({
        module_or_path: decodeInlineWasm(wasmUrl),
      }),
    )
    .then(() => undefined)
    .catch((cause: unknown) => {
      throw errorWithCause(
        `Failed to initialize Oodle WASM: ${errorMessage(cause)}`,
        cause,
      );
    });
  return initialization;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function errorWithCause(message: string, cause: unknown): Error {
  const error = new Error(message) as Error & { cause?: unknown };
  error.cause = cause;
  return error;
}

/** Mermaid/oozextract stored chunk: marker + up to 0x40000 payload bytes. */
const OODLE_STORED_MARKER0 = 0xcc;
const OODLE_STORED_MARKER1 = 0x06;
const OODLE_STORED_CHUNK_PAYLOAD = 0x40000;

export async function decompressOodle(
  input: Uint8Array,
  expectedSize: number,
): Promise<Uint8Array> {
  if (!Number.isSafeInteger(expectedSize) || expectedSize < 0) {
    throw new RangeError(
      "expectedSize must be a safe non-negative integer",
    );
  }
  if (expectedSize > MAX_PBZS_SLOT_UNCOMPRESSED_SIZE) {
    throw new RangeError("expectedSize exceeds the 16 MiB slot limit");
  }

  await initializeWasm();

  const extractor = Extractor.new();
  try {
    const output = extractor.extract(input, expectedSize);
    if (output.length !== expectedSize) {
      throw new Error(
        `Oodle decompression length mismatch: expected ${expectedSize}, got ${output.length}`,
      );
    }
    return output;
  } catch (cause: unknown) {
    if (
      cause instanceof Error &&
      cause.message.startsWith("Oodle decompression length mismatch:")
    ) {
      throw cause;
    }
    throw errorWithCause(
      `Oodle decompression failed: ${errorMessage(cause)}`,
      cause,
    );
  } finally {
    extractor.free();
  }
}

/**
 * Frame plaintext as Oodle "stored" chunks (no real compression).
 * Compatible with Mermaid/oozextract and PBZ-Editor-style 0xCC06 blocks.
 * Used for dirty PBZS rewrites when we cannot ship a licensed compressor.
 */
export async function compressOodleStored(
  plain: Uint8Array,
): Promise<Uint8Array> {
  if (plain.byteLength > MAX_PBZS_SLOT_UNCOMPRESSED_SIZE) {
    throw new RangeError("plain exceeds the 16 MiB slot limit");
  }
  if (plain.byteLength === 0) {
    return new Uint8Array(0);
  }

  const chunkCount = Math.ceil(plain.byteLength / OODLE_STORED_CHUNK_PAYLOAD);
  const out = new Uint8Array(plain.byteLength + chunkCount * 2);
  let read = 0;
  let write = 0;
  while (read < plain.byteLength) {
    const take = Math.min(
      OODLE_STORED_CHUNK_PAYLOAD,
      plain.byteLength - read,
    );
    out[write++] = OODLE_STORED_MARKER0;
    out[write++] = OODLE_STORED_MARKER1;
    out.set(plain.subarray(read, read + take), write);
    write += take;
    read += take;
  }

  const check = await decompressOodle(out, plain.byteLength);
  if (check.byteLength !== plain.byteLength || !bytesEqual(check, plain)) {
    throw new Error("Oodle stored frame failed self round-trip");
  }
  return out;
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
