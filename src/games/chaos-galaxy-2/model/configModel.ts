import {
  getEntry,
  parseEs3Binary,
  serializeEs3Binary,
  setArray,
  type Es3BinaryEntry
} from './es3-binary'
import { gameData } from './gameData'

export type CollectionName = 'CommanderCollections' | 'UnitCollections' | 'EventCollections'

const COLLECTION_NAMES: CollectionName[] = [
  'CommanderCollections',
  'UnitCollections',
  'EventCollections'
]

export class ConfigSnapshot {
  constructor(public entries: Es3BinaryEntry[]) {}

  static load(bytes: Uint8Array): ConfigSnapshot {
    return new ConfigSnapshot(parseEs3Binary(bytes))
  }

  serialize(): Uint8Array {
    return serializeEs3Binary(this.entries)
  }

  getCollection(name: CollectionName): boolean[] {
    const entry = getEntry(this.entries, name)
    if (!entry || entry.kind !== 'bool[]' || !Array.isArray(entry.value)) {
      throw new Error(`Missing collection "${name}"`)
    }
    return entry.value as boolean[]
  }

  setCollectionBit(name: CollectionName, index: number, on: boolean): void {
    const bits = this.getCollection(name)
    if (index < 0 || index >= bits.length) {
      throw new Error(`Collection bit index ${index} out of range for "${name}"`)
    }
    bits[index] = on
    setArray(this.entries, name, bits)
  }

  maxAllCollections(): void {
    const catalogLen: Record<CollectionName, number> = {
      CommanderCollections: gameData.collectionLengths.commanders,
      UnitCollections: gameData.collectionLengths.units,
      EventCollections: gameData.collectionLengths.events
    }
    for (const name of COLLECTION_NAMES) {
      const entry = getEntry(this.entries, name)
      if (!entry || entry.kind !== 'bool[]' || !Array.isArray(entry.value)) continue
      const limit = catalogLen[name]
      const bits = (entry.value as boolean[]).map((bit, index) => (index < limit ? true : bit))
      setArray(this.entries, name, bits)
    }
  }
}
