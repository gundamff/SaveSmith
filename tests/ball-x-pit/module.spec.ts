import { describe, expect, it } from 'vitest'
import { modules } from '@host/registry'
import { ballXPitModule } from '../../src/games/ball-x-pit'
import { parse, serialize, setResources, unlockWiki, validate } from '../../src/games/ball-x-pit/parse'
import { listSlots } from '../../src/games/ball-x-pit/slots'
import { buildMinimalSave } from './fixtures'

describe('ballXPitModule catalog / registry', () => {
  it('registers with two views and locate template', () => {
    expect(ballXPitModule.id).toBe('ball-x-pit')
    expect(ballXPitModule.views.map((v) => v.id)).toEqual(['resources', 'wiki'])
    expect(ballXPitModule.catalog.steamAppId).toBe(2062430)
    expect(ballXPitModule.locate.windowsPathTemplates[0]).toContain('Kenny Sun')
    expect(modules.map((m) => m.id)).toContain('ball-x-pit')
  })
})

describe('ballXPitModule parse / serialize', () => {
  it('round-trips without edits (byte-identical)', () => {
    const bytes = buildMinimalSave()
    const backup = buildMinimalSave({
      resources: { money: 1, rice: 1, wood: 1, stone: 1 },
      heroObtained: [0, 0, 0]
    })
    const state = parse([
      { relativePath: 'meta1.yankai', bytes },
      { relativePath: 'meta1_backup.yankai', bytes: backup }
    ])
    expect(validate(state)).toEqual([])
    const out = serialize(state)
    expect(out).toHaveLength(2)
    expect(out[0]!.bytes).toEqual(bytes)
    expect(out[1]!.bytes).toEqual(backup)
  })

  it('patches main and backup resources independently', () => {
    const main = buildMinimalSave({ resources: { money: 1, rice: 2, wood: 3, stone: 4 } })
    const backup = buildMinimalSave({ resources: { money: 9, rice: 8, wood: 7, stone: 6 } })
    const state = parse([
      { relativePath: 'meta1.yankai', bytes: main },
      { relativePath: 'meta1_backup.yankai', bytes: backup }
    ])
    setResources(state, { money: 50, rice: 60, wood: 70, stone: 80 })
    unlockWiki(state)
    const out = serialize(state)
    expect(out[0]!.bytes).not.toEqual(main)
    expect(out[1]!.bytes).not.toEqual(backup)
    // backups keep their non-resource differences except applied patches
    expect(out[0]!.bytes.length).toBe(main.length)
    expect(out[1]!.bytes.length).toBe(backup.length)
  })
})

describe('ballXPitModule slots', () => {
  it('lists meta1 with backup in sessionFiles', () => {
    const bytes = buildMinimalSave()
    const slots = listSlots({
      dir: 'x',
      files: [
        { relativePath: 'meta1.yankai', bytes },
        { relativePath: 'meta1_backup.yankai', bytes },
        { relativePath: 'saveslotinfo.balls', bytes: new Uint8Array([1, 2, 3]) }
      ]
    })
    expect(slots).toHaveLength(1)
    expect(slots[0]!.id).toBe('meta-1')
    expect(slots[0]!.readable).toBe(true)
    expect(slots[0]!.sessionFiles).toEqual([
      'meta1.yankai',
      'meta1_backup.yankai',
      'saveslotinfo.balls'
    ])
  })
})
