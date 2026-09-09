declare module 'rijndael-js' {
  export default class Rijndael {
    constructor(key: Uint8Array | number[] | string, mode: string)
    encrypt(
      plaintext: Uint8Array | number[] | string,
      blockSize: number,
      iv: Uint8Array | number[] | string
    ): number[]
    decrypt(
      ciphertext: Uint8Array | number[],
      blockSize: number,
      iv: Uint8Array | number[] | string
    ): number[]
  }
}
