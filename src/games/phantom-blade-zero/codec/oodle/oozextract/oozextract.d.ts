export class Extractor {
  free(): void;
  extract(input: Uint8Array, outputSize: number): Uint8Array;
  static new(): Extractor;
}

export interface InitOptions {
  module_or_path:
    | RequestInfo
    | URL
    | Response
    | BufferSource
    | WebAssembly.Module;
}

export default function init(
  options: InitOptions,
): Promise<WebAssembly.Exports>;
