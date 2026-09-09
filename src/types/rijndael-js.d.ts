declare module 'rijndael-js' {
  export default class Rijndael {
    constructor(key: Buffer | string, mode: string)
    encrypt(plaintext: Buffer | string, blockSize: number, iv: Buffer | string): number[]
    decrypt(ciphertext: Buffer, blockSize: number, iv: Buffer | string): number[]
  }
}
