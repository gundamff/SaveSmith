import { describe, expect, it } from 'vitest'
import { validate } from '../../src/games/dragon-sword/parse'
import type { DragonSwordState } from '../../src/games/dragon-sword/model/types'

function sampleState(patch?: Partial<DragonSwordState>): DragonSwordState {
  return {
    relativePath: '1000/1000_Slot1.db',
    salt: new Uint8Array(16),
    plaintextBase: new Uint8Array(4096),
    userDbid: '1000',
    currencies: [{ itemCid: 1000001, amount: 10 }],
    stackables: [{ itemCid: 2000001, stackCnt: 3 }],
    characters: [{ characterCid: 10001, level: 1, exp: 0, ascend: 0 }],
    teams: [{ pageId: 1, slot1: 10001, slot2: 0, slot3: 0 }],
    equipment: [],
    cookItems: [{ itemDbid: '1', itemCid: 4000001, stackCnt: 2, deletedDate: '0' }],
    switches: [],
    titles: [],
    karma: [],
    costumes: [],
    vehicles: [],
    equipMounts: [],
    user: { regionCid: 1, sectionUid: '0', posX: 1.5, posY: -2, posZ: 0 },
    ...patch
  }
}

describe('dragon-sword validate', () => {
  it('accepts a well-formed state', () => {
    expect(validate(sampleState())).toEqual([])
  })

  it('rejects negative or non-finite currency amounts', () => {
    expect(validate(sampleState({ currencies: [{ itemCid: 1000001, amount: -1 }] }))).toEqual([
      { code: 'INVALID_AMOUNT', args: [1000001] }
    ])
    expect(validate(sampleState({ currencies: [{ itemCid: 1000001, amount: Number.POSITIVE_INFINITY }] }))).toEqual([
      { code: 'INVALID_AMOUNT', args: [1000001] }
    ])
    expect(validate(sampleState({ currencies: [{ itemCid: 1000001, amount: Number.NaN }] }))).toEqual([
      { code: 'INVALID_AMOUNT', args: [1000001] }
    ])
  })

  it('rejects negative or non-finite stacks (items and cooking)', () => {
    expect(validate(sampleState({ stackables: [{ itemCid: 2000001, stackCnt: -4 }] }))).toEqual([
      { code: 'INVALID_STACK', args: [2000001] }
    ])
    expect(
      validate(
        sampleState({
          cookItems: [{ itemDbid: '1', itemCid: 4000001, stackCnt: Number.NaN, deletedDate: '0' }]
        })
      )
    ).toEqual([{ code: 'INVALID_STACK', args: [4000001] }])
  })

  it('rejects non-finite world positions', () => {
    expect(validate(sampleState({ user: { regionCid: 1, sectionUid: '0', posX: Infinity, posY: 0, posZ: 0 } }))).toEqual(
      [{ code: 'INVALID_POSITION', args: ['posX'] }]
    )
    expect(validate(sampleState({ user: { regionCid: 1, sectionUid: '0', posX: 0, posY: Number.NaN, posZ: 0 } }))).toEqual(
      [{ code: 'INVALID_POSITION', args: ['posY'] }]
    )
  })

  it('rejects team CIDs that are neither 0 nor an owned character', () => {
    expect(
      validate(sampleState({ teams: [{ pageId: 2, slot1: 99999, slot2: 0, slot3: 10001 }] }))
    ).toEqual([{ code: 'UNKNOWN_TEAM_CID', args: [2, 99999] }])
  })

  it('allows empty team slots (CID 0)', () => {
    expect(validate(sampleState({ teams: [{ pageId: 1, slot1: 0, slot2: 0, slot3: 0 }] }))).toEqual([])
  })
})
