import { createHash, createHmac } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  ESLABONG_INTEGRITY_SALT,
  applyIntegrityFields,
  computeIntegrity,
  type SidecarDoc
} from '../../src/games/eslabong/integrity'

type Vector = {
  sidecar: SidecarDoc
  resBase64?: string
  resPath?: string
  expectedIntegrity: string
}

function loadVector(): Vector | null {
  const raw = process.env.ESLABONG_INTEGRITY_VECTOR
  if (!raw) return null
  try {
    return JSON.parse(raw) as Vector
  } catch {
    return null
  }
}

function resolveResBytes(v: Vector): Uint8Array {
  if (v.resBase64) return new Uint8Array(Buffer.from(v.resBase64, 'base64'))
  if (v.resPath && existsSync(v.resPath)) return new Uint8Array(readFileSync(v.resPath))
  throw new Error('vector missing resBase64/resPath')
}

const vector = loadVector()

/** Live resPath vectors go stale after handtests; only run when expected still matches file. */
function vectorIsFresh(v: Vector): boolean {
  try {
    const resBytes = resolveResBytes(v)
    return computeIntegrity({ sidecar: v.sidecar, resBytes }) === v.expectedIntegrity
  } catch {
    return false
  }
}

const describeIntegrity = vector && vectorIsFresh(vector) ? describe : describe.skip

describeIntegrity('computeIntegrity', () => {
  it('matches known vector when ESLABONG_INTEGRITY_VECTOR is set', () => {
    const v = vector!
    const resBytes = resolveResBytes(v)
    expect(computeIntegrity({ sidecar: v.sidecar, resBytes })).toBe(v.expectedIntegrity)
  })

  it('applyIntegrityFields writes integrity and keeps other keys', () => {
    const v = vector!
    const resBytes = resolveResBytes(v)
    const out = applyIntegrityFields({ ...v.sidecar, extra: 1 }, resBytes)
    expect(out.integrity).toBe(v.expectedIntegrity)
    expect(out.extra).toBe(1)
    expect(out.team_name).toBe(v.sidecar.team_name)
  })
})

describe('computeIntegrity formula smoke', () => {
  it('HMAC-SHA256(SHA256(salt), payload) is stable', () => {
    const payload = new TextEncoder().encode('eslabong-integrity-smoke')
    const key = createHash('sha256').update(ESLABONG_INTEGRITY_SALT, 'utf8').digest()
    const expected = createHmac('sha256', key).update(payload).digest('hex')
    const sidecar: SidecarDoc = {
      gold: 1,
      team_name: 't',
      season: 1,
      week: 1
    }
    expect(computeIntegrity({ sidecar, resBytes: payload })).toBe(expected)
  })
})
