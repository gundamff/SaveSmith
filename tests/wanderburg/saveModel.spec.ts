import { describe, expect, it } from 'vitest'
import sample from './fixtures/sample-plain.json'
import unlockCatalog from '../../src/games/wanderburg/data/unlock-catalog.json'
import {
  getByPath,
  getUnlockedIDs,
  listResourceFields,
  listUnlockCatalog,
  setByPath,
  setUnlockId,
  setUnlockedIDsFromCatalog
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

  it('reads and writes by path', () => {
    const doc = structuredClone(sample) as Record<string, unknown>
    expect(getByPath(doc, 'silver')).toBe(1250)
    setByPath(doc, 'silver', 9999)
    expect(getByPath(doc, 'silver')).toBe(9999)
  })

  it('exposes full unlock catalog (not save-only IDs)', () => {
    const list = listUnlockCatalog()
    expect(list.length).toBe(unlockCatalog.count)
    expect(list.length).toBeGreaterThan(50)
    expect(list.every((x) => typeof x.unlockableID === 'number' && x.name)).toBe(true)
  })

  it('has Chinese names for nearly all unlocks and falls back to English', () => {
    const list = listUnlockCatalog()
    expect(list.every((x) => typeof x.nameEn === 'string' && x.nameEn.length > 0)).toBe(true)
    expect(list.every((x) => typeof x.nameZh === 'string' && x.nameZh.length > 0)).toBe(true)
    const withZh = list.filter((x) => x.nameZh !== x.nameEn)
    expect(withZh.length).toBeGreaterThanOrEqual(60)
    const lightning = list.find((x) => x.nameEn === 'Lightning Mage')
    expect(lightning?.nameZh).toBe('闪电法师')
  })

  it('picks display name from app locale with English fallback', async () => {
    const { unlockDisplayName } = await import('../../src/games/wanderburg/model/saveModel')
    const entry = listUnlockCatalog().find((x) => x.nameEn === 'Lightning Mage')!
    expect(unlockDisplayName(entry, 'zh')).toBe('闪电法师')
    expect(unlockDisplayName(entry, 'en')).toBe('Lightning Mage')
    const missing = listUnlockCatalog().find((x) => x.nameEn.startsWith('#'))
    if (missing) {
      expect(unlockDisplayName(missing, 'zh')).toBe(missing.nameEn)
    }
  })

  it('reads unlockedIDs and toggles without dropping unknown IDs', () => {
    const doc = structuredClone(sample) as Record<string, unknown>
    expect(getUnlockedIDs(doc)).toEqual([101, 205, 310])
    const known = listUnlockCatalog()[0]!.unlockableID
    setUnlockId(doc, known, true)
    expect(getUnlockedIDs(doc)).toEqual(expect.arrayContaining([101, 205, 310, known]))
    setUnlockId(doc, 205, false)
    expect(getUnlockedIDs(doc)).toEqual(expect.arrayContaining([101, 310, known]))
    expect(getUnlockedIDs(doc)).not.toContain(205)
  })

  it('unlock-all / clear only touches catalog IDs and keeps unknowns', () => {
    const doc = {
      unlockedIDs: [999001, listUnlockCatalog()[0]!.unlockableID]
    } as Record<string, unknown>
    setUnlockedIDsFromCatalog(doc, true)
    const afterAll = getUnlockedIDs(doc)
    expect(afterAll).toContain(999001)
    expect(afterAll.length).toBe(unlockCatalog.count + 1)
    setUnlockedIDsFromCatalog(doc, false)
    expect(getUnlockedIDs(doc)).toEqual([999001])
  })
})
