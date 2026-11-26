import { describe, expect, it } from 'vitest'
import { decryptSaveDat } from '../../src/games/re2-i-rise-alone/crypto/aesEcb'
import {
  listSlotMetas,
  openBagFromCipher,
  parseSavedData,
  readSavedDataJson,
  sealBag,
  setSlotSavedData
} from '../../src/games/re2-i-rise-alone/model/bag'
import { readResources, writeResource } from '../../src/games/re2-i-rise-alone/model/resources'
import { stringifySavedData } from '../../src/games/re2-i-rise-alone/model/savedData'
import {
  AUTO_SLOT_ID,
  makeCipherFixture,
  makePlainBag,
  MANUAL_SLOT_ID
} from './fixtures'

describe('re2ira bag', () => {
  it('opens cipher and lists 1 manual + 1 auto slot', () => {
    const cipher = makeCipherFixture()
    const { bag } = openBagFromCipher(cipher)
    const metas = listSlotMetas(bag)
    expect(metas).toHaveLength(2)
    expect(metas.filter((m) => m.kind === 'manual')).toHaveLength(1)
    expect(metas.filter((m) => m.kind === 'auto')).toHaveLength(1)
    expect(metas.find((m) => m.id === MANUAL_SLOT_ID)?.savedName).toBe('手动1')
    expect(metas.find((m) => m.id === AUTO_SLOT_ID)?.savedName).toBe('自动存档')
  })

  it('projects resources whitelist per slot', () => {
    const { bag } = openBagFromCipher(makeCipherFixture())
    const manualJson = readSavedDataJson(bag, MANUAL_SLOT_ID)
    const autoJson = readSavedDataJson(bag, AUTO_SLOT_ID)
    const manual = parseSavedData(manualJson)
    const auto = parseSavedData(autoJson)

    const manualRes = readResources(manual.Data)
    const autoRes = readResources(auto.Data)

    expect(Object.keys(manualRes).sort()).toEqual(['Money', 'Stamina'].sort())
    expect(Object.keys(autoRes).sort()).toEqual(
      ['Charm', 'Execution', 'Morality', 'Money', 'Pressure', 'Stamina', 'Wisdom'].sort()
    )
    expect('MMFavorability' in autoRes).toBe(false)
    expect(auto.Data.property_Property_MMFavorability).toBe('99')
  })

  it('sealBag zero dirty returns byte-identical cipher', () => {
    const cipher = makeCipherFixture()
    const opened = openBagFromCipher(cipher)
    const sealed = sealBag({
      bag: opened.bag,
      rawPlain: opened.rawPlain,
      originalCipher: opened.originalCipher,
      dirtySlotIds: new Set()
    })
    expect(sealed).toEqual(opened.originalCipher)
    expect(sealed).not.toBe(opened.originalCipher)
  })

  it('sealBag only patches manual slot; auto and Language unchanged', () => {
    const cipher = makeCipherFixture()
    const opened = openBagFromCipher(cipher)
    const autoBefore = readSavedDataJson(opened.bag, AUTO_SLOT_ID)

    const manualJson = readSavedDataJson(opened.bag, MANUAL_SLOT_ID)
    const parsed = parseSavedData(manualJson)
    writeResource(parsed.Data, 'Money', 999)
    parsed.raw.Data = parsed.Data
    const updatedJson = stringifySavedData(parsed.raw)
    setSlotSavedData(opened.bag, MANUAL_SLOT_ID, updatedJson)

    const sealed = sealBag({
      bag: opened.bag,
      rawPlain: opened.rawPlain,
      originalCipher: opened.originalCipher,
      dirtySlotIds: new Set([MANUAL_SLOT_ID])
    })

    const plainAfter = new TextDecoder().decode(decryptSaveDat(sealed))
    const bagObj = JSON.parse(plainAfter) as Record<string, string>
    expect(bagObj.Language).toBe('Chinese')
    expect(bagObj[`${AUTO_SLOT_ID}_Data`]).toBe(autoBefore)

    const manualAfter = parseSavedData(bagObj[`${MANUAL_SLOT_ID}_Data`]!)
    expect(readResources(manualAfter.Data).Money).toBe(999)

    const autoAfter = parseSavedData(bagObj[`${AUTO_SLOT_ID}_Data`]!)
    expect(autoAfter.Data.property_Property_MMFavorability).toBe('99')
  })

  it('parse round-trips plain fixture', () => {
    const plain = makePlainBag()
    const { bag, rawPlain } = openBagFromCipher(makeCipherFixture())
    expect(rawPlain).toBe(plain)
    expect(bag.get('Language')).toBe('Chinese')
  })
})