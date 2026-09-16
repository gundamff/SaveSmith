import { describe, expect, it } from 'vitest'
import { parseEs3Binary } from '../../src/games/chaos-galaxy-2/model/es3-binary'
import { parse, serialize } from '../../src/games/chaos-galaxy-2/parse'
import { encodeMinimalCampaign, encodeMinimalConfig } from './fixtures'

describe('parse / serialize round-trip', () => {
  it('round-trips campaign and config bytes', () => {
    const campaignBytes = encodeMinimalCampaign()
    const configBytes = encodeMinimalConfig()
    const state = parse([
      { relativePath: 'savedata2.cg2', bytes: campaignBytes },
      { relativePath: 'config.cg2', bytes: configBytes }
    ])
    expect(state.slot).toBe(2)
    expect(state.campaignEntries).toEqual(parseEs3Binary(campaignBytes))
    expect(state.configEntries).toEqual(parseEs3Binary(configBytes))

    const out = serialize(state)
    expect(out.map((f) => f.relativePath)).toEqual(['savedata2.cg2', 'config.cg2'])
    expect([...out[0]!.bytes]).toEqual([...campaignBytes])
    expect([...out[1]!.bytes]).toEqual([...configBytes])
  })

  it('serializes campaign only when configEntries is null', () => {
    const campaignBytes = encodeMinimalCampaign()
    const state = parse([{ relativePath: 'savedata0.cg2', bytes: campaignBytes }])
    expect(state.configEntries).toBeNull()
    const out = serialize(state)
    expect(out).toEqual([{ relativePath: 'savedata0.cg2', bytes: campaignBytes }])
  })
})
