declare module 'zstd-codec' {
  export class ZstdCodec {
    static run(callback: (zstd: {
      Simple: new () => {
        compress(data: Uint8Array | ArrayBuffer): Uint8Array
        decompress(data: Uint8Array | ArrayBuffer): Uint8Array
      }
    }) => void): void
  }
}
