/**
 * Optional real-save gate. Set BALLXPIT_SAVE to a metaN.yankai path (copy preferred).
 * Never commits player saves into the repo.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { validateEnvelope } from '../../src/games/ball-x-pit/model/binary'
import { readResources, writeResources } from '../../src/games/ball-x-pit/model/resources'
import { projectWiki, unlockAllWiki } from '../../src/games/ball-x-pit/model/wiki'

const path = process.env.BALLXPIT_SAVE

describe.skipIf(!path)('ball-x-pit real save (BALLXPIT_SAVE)', () => {
  it('envelope + resource + wiki unlock keep size', () => {
    const original = new Uint8Array(readFileSync(path!))
    validateEnvelope(original)
    const before = readResources(original)
    const wikiBefore = projectWiki(original)

    const edited = new Uint8Array(original)
    writeResources(edited, {
      money: Math.min(before.money + 1, 0x7fffffff),
      rice: before.rice,
      wood: before.wood,
      stone: before.stone
    })
    unlockAllWiki(edited)
    expect(edited.length).toBe(original.length)
    expect(projectWiki(edited).heroDiscovered).toBe(wikiBefore.heroTotal)
    expect(projectWiki(edited).passiveDiscovered).toBe(wikiBefore.passiveTotal)
    expect(projectWiki(edited).comboDiscovered).toBe(wikiBefore.comboCells)
  })
})
