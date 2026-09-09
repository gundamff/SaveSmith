import { describe, expect, it } from 'vitest'
import sample from './fixtures/sample-plain.json'
import {
  displayName,
  getByPath,
  listResourceFields,
  listUnlockEntries,
  setByPath,
  setUnlock
} from '../../src/games/wanderburg/model/saveModel'

describe('wanderburg saveModel', () => {
  it('lists numeric resource fields', () => {
    const fields = listResourceFields(sample)
    expect(fields.some((f) => typeof f.value === 'number')).toBe(true)
    expect(fields.some((f) => f.path === 'silver' && f.value === 1250)).toBe(true)
    expect(fields.some((f) => f.path === 'silverBeforeLastRun')).toBe(true)
    expect(fields.some((f) => f.path === 'unlockedIDs')).toBe(false)
    expect(fields.some((f) => f.path === 'lastLoadout')).toBe(false)
    expect(fields.some((f) => f.path === 'saveVersion')).toBe(false)
    expect(fields.some((f) => f.path === 'lastSavedUtcTicks')).toBe(false)
    expect(fields.some((f) => f.path === 'progressResetGeneration')).toBe(false)
  })

  it('skips save metadata numerics', () => {
    const doc = {
      saveVersion: 7,
      lastSavedUtcTicks: 638000000000000,
      progressResetGeneration: 2,
      silver: 100,
      silverBeforeLastRun: 50
    } as Record<string, unknown>
    const paths = listResourceFields(doc).map((f) => f.path)
    expect(paths).toEqual(['silver', 'silverBeforeLastRun'])
  })

  it('ignores unknown unlock IDs', () => {
    const doc = structuredClone(sample) as Record<string, unknown>
    const before = [...(doc.unlockedIDs as number[])]
    setUnlock(doc, '99999', true)
    expect(doc.unlockedIDs).toEqual(before)
    expect(listUnlockEntries(doc).some((e) => e.id === '99999')).toBe(false)
    setUnlock(doc, 'not-a-number', true)
    expect(doc.unlockedIDs).toEqual(before)
  })

  it('toggles unlock membership', () => {
    const doc = structuredClone(sample) as Record<string, unknown>
    const id = listUnlockEntries(doc)[0]!.id
    setUnlock(doc, id, false)
    expect(listUnlockEntries(doc).find((e) => e.id === id)?.unlocked).toBe(false)
    setUnlock(doc, id, true)
    expect(listUnlockEntries(doc).find((e) => e.id === id)?.unlocked).toBe(true)
  })

  it('reads and writes by path', () => {
    const doc = structuredClone(sample) as Record<string, unknown>
    expect(getByPath(doc, 'silver')).toBe(1250)
    setByPath(doc, 'silver', 9999)
    expect(getByPath(doc, 'silver')).toBe(9999)
  })

  it('displayName falls back to id', () => {
    expect(displayName('101')).toBe('101')
  })
})
