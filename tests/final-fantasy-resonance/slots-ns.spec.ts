import { describe, expect, it } from 'vitest'
import { identifySaveDir, matchSlotFilePatterns } from '../../src/sdk/session'
import { locate } from '../../src/games/final-fantasy-resonance/locate'
import { listSlots } from '../../src/games/final-fantasy-resonance/slots'

describe('ffr Nintendo Switch export naming', () => {
  it('identifies JKSV-style dirs without .sav suffix', () => {
    expect(
      identifySaveDir(locate, [
        'GameSaveData0',
        'GameSaveData1',
        'OptionSaveData',
        'EnhancedInputUserSettings'
      ])
    ).toBe(true)
    expect(identifySaveDir(locate, ['OptionSaveData', 'EnhancedInputUserSettings'])).toBe(false)
  })

  it('still identifies Steam PC .sav dirs', () => {
    expect(identifySaveDir(locate, ['GameSaveData0.sav', 'OptionSaveData.sav'])).toBe(true)
  })

  it('slot patterns match extensionless and .sav names', () => {
    const paths = [
      'GameSaveData0',
      'GameSaveData1',
      'GameSaveData0.sav',
      'OptionSaveData',
      'EnhancedInputUserSettings'
    ]
    const matched = matchSlotFilePatterns(paths, locate.slotFilePatterns ?? [])
    expect(matched.sort()).toEqual(['GameSaveData0', 'GameSaveData0.sav', 'GameSaveData1'].sort())
  })

  it('listSlots titles Autosave / Slot for extensionless files', () => {
    const slots = listSlots({
      dir: 'X',
      files: [
        { relativePath: 'GameSaveData0', bytes: null },
        { relativePath: 'GameSaveData1', bytes: null },
        { relativePath: 'OptionSaveData', bytes: null }
      ]
    })
    expect(slots.map((s) => s.id)).toEqual(['ffr-0', 'ffr-1'])
    expect(slots[0]!.title).toBe('Autosave')
    expect(slots[1]!.title).toBe('Slot 01')
    expect(slots[0]!.sessionFiles).toEqual(['GameSaveData0'])
  })
})
