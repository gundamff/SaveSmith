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
