export type PbzsCompression = 0 | 1 | 2 | number;

export interface PbzsDirectoryEntry {
  name: string;
  compression: PbzsCompression;
  sealed: 0 | 1;
  uncompressedSize: number;
  relativeOffset: number;
  sealedBlockLength: number;
}

export interface PbzsSlotBlock {
  entry: PbzsDirectoryEntry;
  sealedBytes: Uint8Array;
}

export interface PbzsContainer {
  outerHeader: Uint8Array;
  directoryBlock: Uint8Array;
  slots: PbzsSlotBlock[];
}
