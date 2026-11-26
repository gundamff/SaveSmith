import { describe, expect, it } from 'vitest'
import { ModuleError } from '@sdk/error'
import {
  dataKey,
  readResources,
  writeResource,
  RESOURCE_KEYS
} from '../../src/games/re2-i-rise-alone/model/resources'

describe('re2ira resources', () => {
  it('maps dataKey to property_Property_*', () => {
    expect(dataKey('Money')).toBe('property_Property_Money')
    expect(RESOURCE_KEYS).toHaveLength(7)
  })

  it('reads only whitelist keys and ignores non-integers', () => {
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
    expect(Object.keys(r)).toHaveLength(2)
  })

  it('writes existing resource and rejects missing keys', () => {
    const data: Record<string, string> = {
      property_Property_Money: '100'
    }
    writeResource(data, 'Money', 999)
    expect(readResources(data).Money).toBe(999)
    expect(data.property_Property_Money).toBe('999')

    expect(() => writeResource(data, 'Wisdom', 1)).toThrow(ModuleError)
    try {
      writeResource(data, 'Wisdom', 1)
    } catch (e) {
      expect(e).toBeInstanceOf(ModuleError)
      expect((e as ModuleError).code).toBe('MISSING_FIELD')
      expect((e as ModuleError).args).toEqual(['Wisdom'])
    }
  })

  it('rejects negative and non-integer values', () => {
    const data = { property_Property_Money: '1' }
    expect(() => writeResource(data, 'Money', -1)).toThrow(ModuleError)
    expect(() => writeResource(data, 'Money', 1.5)).toThrow(ModuleError)
  })
})