import { ModuleError } from '@sdk/error'
import {
  encodeFieldName,
  findAllFieldOffsets,
  findIntArrayNearField,
  findUniqueField,
  readI32,
  writeI32
} from './binary'

export interface WikiProgress {
  heroTotal: number
  heroDiscovered: number
  passiveTotal: number
  passiveDiscovered: number
  comboCells: number
  comboDiscovered: number
}

function sectionBounds(data: Uint8Array): {
  heroStart: number
  passiveStart: number
  harvestStart: number
} {
  const heroStart = findUniqueField(data, 'HeroStats')
  const passiveStart = findUniqueField(data, 'PassiveStats')
  const harvestStart = findUniqueField(data, 'NumHarvests')
  if (!(heroStart < passiveStart && passiveStart < harvestStart)) {
    throw new ModuleError('BXP_WIKI_BOUNDS', [])
  }
  return { heroStart, passiveStart, harvestStart }
}

function obtainedValueOffsets(data: Uint8Array, start: number, end: number): number[] {
  const name = 'NumObtained'
  const nameLen = encodeFieldName(name).length
  return findAllFieldOffsets(data, name, start, end).map((at) => at + nameLen)
}

function comboArrays(data: Uint8Array, start: number, end: number, heroCount: number) {
  const name = 'NumCombos'
  const fields = findAllFieldOffsets(data, name, start, end)
  if (fields.length !== heroCount) {
    throw new ModuleError('BXP_COMBO_ROWS', [fields.length, heroCount])
  }
  return fields.map((at) =>
    findIntArrayNearField(data, at, name, 64, {
      requireMarker4: true,
      expectedCount: heroCount
    })
  )
}

export function projectWiki(data: Uint8Array): WikiProgress {
  const { heroStart, passiveStart, harvestStart } = sectionBounds(data)
  const heroObtained = obtainedValueOffsets(data, heroStart, passiveStart)
  const passiveObtained = obtainedValueOffsets(data, passiveStart, harvestStart)
  if (!heroObtained.length || !passiveObtained.length) {
    throw new ModuleError('BXP_WIKI_EMPTY', [])
  }
  const combos = comboArrays(data, heroStart, passiveStart, heroObtained.length)

  let heroDiscovered = 0
  for (const off of heroObtained) {
    if (readI32(data, off) > 0) heroDiscovered++
  }
  let passiveDiscovered = 0
  for (const off of passiveObtained) {
    if (readI32(data, off) > 0) passiveDiscovered++
  }

  let comboCells = 0
  let comboDiscovered = 0
  for (const arr of combos) {
    // editable cells: indices 1..count-1 (index 0 is format marker 4)
    for (let i = 1; i < arr.count; i++) {
      comboCells++
      if (readI32(data, arr.valuesOffset + i * 4) > 0) comboDiscovered++
    }
  }

  return {
    heroTotal: heroObtained.length,
    heroDiscovered,
    passiveTotal: passiveObtained.length,
    passiveDiscovered,
    comboCells,
    comboDiscovered
  }
}

/**
 * Discover all ball / passive / combination wiki counters.
 * Sets NumObtained and NumCombos cells from <=0 to 1; never changes combo marker (index 0).
 * Mutates `data` in place. Returns number of int32 cells changed.
 */
export function unlockAllWiki(data: Uint8Array): number {
  const { heroStart, passiveStart, harvestStart } = sectionBounds(data)
  const heroObtained = obtainedValueOffsets(data, heroStart, passiveStart)
  const passiveObtained = obtainedValueOffsets(data, passiveStart, harvestStart)
  if (!heroObtained.length || !passiveObtained.length) {
    throw new ModuleError('BXP_WIKI_EMPTY', [])
  }
  const combos = comboArrays(data, heroStart, passiveStart, heroObtained.length)

  let changed = 0
  const bump = (off: number) => {
    if (readI32(data, off) <= 0) {
      writeI32(data, off, 1)
      changed++
    }
  }

  for (const off of heroObtained) bump(off)
  for (const off of passiveObtained) bump(off)
  for (const arr of combos) {
    if (readI32(data, arr.valuesOffset) !== 4) {
      throw new ModuleError('BXP_COMBO_MARKER', [])
    }
    for (let i = 1; i < arr.count; i++) {
      bump(arr.valuesOffset + i * 4)
    }
  }
  return changed
}
