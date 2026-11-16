import { describe, expect, it } from 'vitest'
import { ModuleError } from '@sdk/error'
import { readI32, validateEnvelope } from '../../src/games/ball-x-pit/model/binary'
import { findAllFieldOffsets, encodeFieldName } from '../../src/games/ball-x-pit/model/binary'
import { projectWiki, unlockAllWiki } from '../../src/games/ball-x-pit/model/wiki'
import { buildMinimalSave } from './fixtures'

describe('ball-x-pit wiki', () => {
  it('projects progress and unlocks zeros without touching positives or combo marker', () => {
    const original = buildMinimalSave({
      heroObtained: [0, 5, 0],
      heroCombos: [
        [0, 2],
        [0, 0],
        [7, 0]
      ],
      passiveObtained: [0, 3]
    })
    validateEnvelope(original)
    const before = projectWiki(original)
    expect(before).toEqual({
      heroTotal: 3,
      heroDiscovered: 1,
      passiveTotal: 2,
      passiveDiscovered: 1,
      comboCells: 6,
      comboDiscovered: 2
    })

    const edited = new Uint8Array(original)
    const changed = unlockAllWiki(edited)
    expect(changed).toBeGreaterThan(0)
    const after = projectWiki(edited)
    expect(after.heroDiscovered).toBe(3)
    expect(after.passiveDiscovered).toBe(2)
    expect(after.comboDiscovered).toBe(6)

    // positives preserved
    const heroFields = findAllFieldOffsets(
      edited,
      'NumObtained',
      findAllFieldOffsets(edited, 'HeroStats')[0]!,
      findAllFieldOffsets(edited, 'PassiveStats')[0]!
    )
    const secondValue = heroFields[1]! + encodeFieldName('NumObtained').length
    expect(readI32(edited, secondValue)).toBe(5)

    // combo markers stay 4
    const comboFields = findAllFieldOffsets(
      edited,
      'NumCombos',
      findAllFieldOffsets(edited, 'HeroStats')[0]!,
      findAllFieldOffsets(edited, 'PassiveStats')[0]!
    )
    for (const at of comboFields) {
      // find 08 after field
      const end = at + encodeFieldName('NumCombos').length + 64
      let header = -1
      for (let h = at + encodeFieldName('NumCombos').length; h < end; h++) {
        if (edited[h] === 0x08) {
          header = h
          break
        }
      }
      expect(header).toBeGreaterThan(0)
      expect(readI32(edited, header + 5)).toBe(4)
    }
  })

  it('refuses unlock when combo row count mismatches heroes', () => {
    const data = buildMinimalSave({ heroObtained: [0, 0] })
    // corrupt: wipe one NumCombos name length so a row disappears — easier: truncate combos by rebuilding wrong
    // Use a save then zero out second NumCombos field name's length prefix to break find
    const fields = findAllFieldOffsets(
      data,
      'NumCombos',
      findAllFieldOffsets(data, 'HeroStats')[0]!,
      findAllFieldOffsets(data, 'PassiveStats')[0]!
    )
    expect(fields.length).toBe(2)
    // rename second NumCombos to NumComboZ by flipping last char in UTF-16
    const at = fields[1]!
    const nameBytes = encodeFieldName('NumCombos')
    data[at + nameBytes.length - 2] = 'Z'.charCodeAt(0)
    expect(() => unlockAllWiki(data)).toThrow(ModuleError)
  })
})
