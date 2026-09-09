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
  it('lists only allowlisted currency fields with labels', () => {
    const fields = listResourceFields(sample)
    expect(fields.map((f) => f.path)).toEqual(['silver', 'silverBeforeLastRun'])
    expect(fields[0]).toMatchObject({
      path: 'silver',
      value: 1250,
      labelKey: 'wb.resources.silver'
    })
    expect(fields.some((f) => f.path.includes('lifetimeStatistics'))).toBe(false)
    expect(fields.some((f) => f.path.includes('lastCompletedRunStatistics'))).toBe(false)
    expect(fields.some((f) => f.path === 'unlockedIDs')).toBe(false)
    expect(fields.some((f) => f.path === 'saveVersion')).toBe(false)
  })

  it('skips missing allowlist keys and metadata', () => {
    const doc = {
      saveVersion: 7,
      lastSavedUtcTicks: 638000000000000,
      progressResetGeneration: 2,
      silver: 100,
      lifetimeStatistics: { enemiesDestroyed: 9 }
    } as Record<string, unknown>
    const fields = listResourceFields(doc)
    expect(fields.map((f) => f.path)).toEqual(['silver'])
    expect(fields[0]!.labelKey).toBe('wb.resources.silver')
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

  it('displayName falls back to unlock id label', () => {
    expect(displayName('101')).toBe('解锁 #101')
  })
})
