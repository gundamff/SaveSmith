import { describe, expect, it } from 'vitest'
import { readClub, writeClub } from '../../src/games/eslabong/model/club'
import { CLUB_KEYS } from '../../src/games/eslabong/model/fields'
import type { ResourceDoc } from '../../src/games/eslabong/resource/binary'
import { getPath } from '../../src/games/eslabong/resource/binary'

/** Minimal root-only fixture — getPath/setPath only touch `root`. */
function makeClubDoc(overrides: Record<string, number> = {}): ResourceDoc {
  return {
    wire: null as unknown as ResourceDoc['wire'],
    root: {
      player_gold: 1000,
      renown: 50,
      development_stars: 10,
      highest_renown_reached: 100,
      ...overrides
    }
  }
}

describe('eslabong club model', () => {
  it('CLUB_KEYS lists the four editable club scalars', () => {
    expect([...CLUB_KEYS]).toEqual([
      'player_gold',
      'renown',
      'development_stars',
      'highest_renown_reached'
    ])
  })

  it('readClub returns numbers from doc root', () => {
    const doc = makeClubDoc({
      player_gold: 2919170,
      renown: 120,
      development_stars: 44,
      highest_renown_reached: 200
    })
    expect(readClub(doc)).toEqual({
      gold: 2919170,
      renown: 120,
      developmentStars: 44,
      highestRenownReached: 200
    })
  })

  it('writeClub bumps highestRenownReached only upward', () => {
    const doc = makeClubDoc({
      renown: 50,
      highest_renown_reached: 100
    })

    writeClub(doc, { renown: 80 })
    expect(readClub(doc).renown).toBe(80)
    expect(readClub(doc).highestRenownReached).toBe(100)
    expect(getPath(doc, 'highest_renown_reached')).toBe(100)

    writeClub(doc, { renown: 120 })
    expect(readClub(doc).renown).toBe(120)
    expect(readClub(doc).highestRenownReached).toBe(120)
    expect(getPath(doc, 'highest_renown_reached')).toBe(120)
  })

  it('writeClub sets player_gold when gold provided', () => {
    const doc = makeClubDoc({ player_gold: 1000 })
    writeClub(doc, { gold: 8888888 })
    expect(getPath(doc, 'player_gold')).toBe(8888888)
    expect(readClub(doc).gold).toBe(8888888)
  })

  it('writeClub sets developmentStars without touching renown highest', () => {
    const doc = makeClubDoc({
      development_stars: 10,
      renown: 50,
      highest_renown_reached: 100
    })
    writeClub(doc, { developmentStars: 99 })
    expect(readClub(doc).developmentStars).toBe(99)
    expect(getPath(doc, 'development_stars')).toBe(99)
    expect(readClub(doc).highestRenownReached).toBe(100)
  })
})
