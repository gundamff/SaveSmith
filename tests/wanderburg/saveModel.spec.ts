import { describe, expect, it } from 'vitest'
import sample from './fixtures/sample-plain.json'
import { getByPath, listResourceFields, setByPath } from '../../src/games/wanderburg/model/saveModel'

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

  it('reads and writes by path', () => {
    const doc = structuredClone(sample) as Record<string, unknown>
    expect(getByPath(doc, 'silver')).toBe(1250)
    setByPath(doc, 'silver', 9999)
    expect(getByPath(doc, 'silver')).toBe(9999)
  })
})
