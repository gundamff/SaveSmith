import { describe, expect, it } from 'vitest'
import { modules } from '@host/registry'
import { decryptSaveDat } from '../../src/games/re2-i-rise-alone/crypto/aesEcb'
import { re2IRiseAloneModule } from '../../src/games/re2-i-rise-alone'
import { parseSavedData, readSavedDataJson } from '../../src/games/re2-i-rise-alone/model/bag'
import { readResources } from '../../src/games/re2-i-rise-alone/model/resources'
import { parse, serialize, setResource, validate } from '../../src/games/re2-i-rise-alone/parse'
import { listSlots } from '../../src/games/re2-i-rise-alone/slots'
import { AUTO_SLOT_ID, makeCipherFixture, MANUAL_SLOT_ID } from './fixtures'

describe('re2IRiseAloneModule catalog / registry', () => {
  it('registers with locate template', () => {
    expect(re2IRiseAloneModule.id).toBe('re2-i-rise-alone')
    expect(re2IRiseAloneModule.catalog.steamAppId).toBe(3816120)
    expect(re2IRiseAloneModule.locate.windowsPathTemplates[0]).toContain('ProudmateEntertainment')
    expect(re2IRiseAloneModule.locate.identifyAnyOf).toEqual(['SaveData.dat'])
    expect(modules.map((m) => m.id)).toContain('re2-i-rise-alone')
  })
})

describe('re2IRiseAloneModule parse / serialize', () => {
  it('round-trips without edits (byte-identical)', () => {
    const bytes = makeCipherFixture()
    const state = parse([{ relativePath: 'SaveData.dat', bytes }])
    expect(validate(state)).toEqual([])
    const out = serialize(state)
    expect(out).toHaveLength(1)
    expect(out[0]!.bytes).toEqual(bytes)
  })

  it('parse manual slot has only Money and Stamina resources', () => {
    const bytes = makeCipherFixture()
    const state = parse([{ relativePath: 'SaveData.dat', bytes }], { slotId: MANUAL_SLOT_ID })
    expect(state.slotId).toBe(MANUAL_SLOT_ID)
    expect(state.kind).toBe('manual')
    expect(Object.keys(state.resources).sort()).toEqual(['Money', 'Stamina'].sort())
  })

  it('Money patch leaves auto slot _Data unchanged', () => {
    const bytes = makeCipherFixture()
    const state = parse([{ relativePath: 'SaveData.dat', bytes }], { slotId: MANUAL_SLOT_ID })
    const autoBefore = readSavedDataJson(state.bag, AUTO_SLOT_ID)
    setResource(state, 'Money', 4242)
    const out = serialize(state)
    expect(out[0]!.bytes).not.toEqual(bytes)

    const plainAfter = new TextDecoder().decode(decryptSaveDat(out[0]!.bytes))
    const bagObj = JSON.parse(plainAfter) as Record<string, string>
    expect(bagObj[`${AUTO_SLOT_ID}_Data`]).toBe(autoBefore)

    const manualAfter = parseSavedData(bagObj[`${MANUAL_SLOT_ID}_Data`]!)
    expect(readResources(manualAfter.Data).Money).toBe(4242)
  })
})