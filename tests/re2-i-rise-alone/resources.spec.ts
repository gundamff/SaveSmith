import { describe, expect, it } from 'vitest'
import { ModuleError } from '@sdk/error'
import {
  dataKey,
  projectResources,
  readResources,
  writeResource,
  RESOURCE_KEYS
} from '../../src/games/re2-i-rise-alone/model/resources'

describe('re2ira resources', () => {
  it('covers GetAllPropertyKey protagonist attrs', () => {
    expect(dataKey('Money')).toBe('property_Property_Money')
    expect(dataKey('CapacityForLiquor')).toBe('property_Property_CapacityForLiquor')
    expect(RESOURCE_KEYS).toEqual([
      'Stamina',
      'Wisdom',
      'Charm',
      'Morality',
      'CapacityForLiquor',
      'Execution',
      'Money',
      'Pressure'
    ])
  })

  it('reads only whitelist keys and ignores favorability / non-integers', () => {
    const data: Record<string, string> = {
      property_Property_Money: '100',
      property_Property_Stamina: '5',
      property_Property_MMFavorability: '99',
      property_Property_Charm: 'not-a-number'
    }
    const r = readResources(data)
    expect(r.Money).toBe(100)
    expect(r.Stamina).toBe(5)
    expect(r.Charm).toBeUndefined()
    expect('MMFavorability' in r).toBe(false)
  })

  it('projects missing keys as 0 for the editor UI', () => {
    const p = projectResources({ property_Property_Money: '10' })
    expect(p.Money).toBe(10)
    expect(p.Execution).toBe(0)
    expect(p.CapacityForLiquor).toBe(0)
    expect(Object.keys(p)).toHaveLength(RESOURCE_KEYS.length)
  })

  it('upserts missing whitelist keys', () => {
    const data: Record<string, string> = {
      property_Property_Money: '100'
    }
    writeResource(data, 'Money', 999)
    writeResource(data, 'Execution', 20)
    writeResource(data, 'CapacityForLiquor', 50)
    expect(readResources(data).Money).toBe(999)
    expect(readResources(data).Execution).toBe(20)
    expect(readResources(data).CapacityForLiquor).toBe(50)
    expect(data.property_Property_Execution).toBe('20')
  })

  it('rejects negative and non-integer values', () => {
    const data = { property_Property_Money: '1' }
    expect(() => writeResource(data, 'Money', -1)).toThrow(ModuleError)
    expect(() => writeResource(data, 'Money', 1.5)).toThrow(ModuleError)
  })
})
