import { describe, expect, it } from 'vitest'
import {
  aircraftLabel,
  CATALOG_AIRCRAFT,
  CATALOG_EMBLEMS,
  CATALOG_MISSIONS,
  CATALOG_SKINS,
  missionLabel
} from '../../src/games/ace-combat-8/model/catalog'

describe('ace-combat-8 catalog names', () => {
  it('has named aircraft / skins / emblems / missions from extracted assets', () => {
    expect(CATALOG_AIRCRAFT).toHaveLength(36)
    expect(aircraftLabel(1010)).toContain('A-10C')
    expect(CATALOG_SKINS.length).toBe(882)
    expect(CATALOG_EMBLEMS.length).toBe(285)
    expect(CATALOG_MISSIONS).toHaveLength(31)
    expect(missionLabel(1)).toContain('Wings of Theve')
  })
})
