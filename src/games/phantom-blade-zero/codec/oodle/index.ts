import initOozextract, {
  Extractor,
} from "./oozextract/oozextract.js";
import wasmUrl from "./oozextract/oozextract_bg.wasm?inline";

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
  initialization ??= initOozextract({
    module_or_path: decodeInlineWasm(wasmUrl),
  })
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

export async function decompressOodle(
  input: Uint8Array,
  expectedSize: number,
): Promise<Uint8Array> {
  if (!Number.isSafeInteger(expectedSize) || expectedSize < 0) {
    throw new RangeError(
      "expectedSize must be a safe non-negative integer",
    );
  }

  await initializeWasm();

  if (expectedSize < Number.MAX_SAFE_INTEGER) {
    const probe = Extractor.new();
    let hasMoreOutput = false;
    try {
      probe.extract(input, expectedSize + 1);
      hasMoreOutput = true;
    } catch {
      // Failing immediately beyond the requested boundary is expected.
    } finally {
      probe.free();
    }
    if (hasMoreOutput) {
      throw new Error(
        `Oodle decompression length mismatch: output exceeds expected length ${expectedSize}`,
      );
    }
  }

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
