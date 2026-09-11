/**
 * SQLCipher passphrase for DragonSword slot databases.
 *
 * Public format (do not copy editor implementations):
 * https://github.com/gfriloux/dragonsword-save-editor/tree/main/docs
 *
 * The client FNV-1a-64-hashes a UTF-16 literal and prints the 64-bit value
 * as decimal. SQLCipher still treats this string as a passphrase (UTF-8),
 * then runs PBKDF2-HMAC-SHA512 — it is not a raw `x'hex'` key.
 */
export const SQLCIPHER_PASSPHRASE = '13314374259236352028'
