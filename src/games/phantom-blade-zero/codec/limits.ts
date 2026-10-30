// Real saves observed during development peak around 127 KiB per slot. These
// limits leave ample headroom while bounding attacker-controlled allocations.
export const MAX_PBZS_SLOT_UNCOMPRESSED_SIZE = 16 * 1024 * 1024;
export const MAX_PBZS_TOTAL_UNCOMPRESSED_SIZE = 64 * 1024 * 1024;
