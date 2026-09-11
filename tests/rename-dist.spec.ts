import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { copyPortableExe, portableAssetName } from '../scripts/rename-dist.mjs'

const temps: string[] = []

afterEach(() => {
  for (const dir of temps.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('portableAssetName', () => {
  it('puts the version into the published exe name', () => {
    expect(portableAssetName('0.3.0')).toBe('SaveSmith-0.3.0-windows-x64.exe')
  })
})

describe('copyPortableExe', () => {
  it('copies the cargo exe to the versioned name beside it', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'savesmith-dist-'))
    temps.push(dir)
    const src = path.join(dir, 'savesmith.exe')
    fs.writeFileSync(src, 'fake-exe')

    const dst = copyPortableExe({ version: '0.3.0', src })

    expect(path.basename(dst)).toBe('SaveSmith-0.3.0-windows-x64.exe')
    expect(fs.readFileSync(dst, 'utf8')).toBe('fake-exe')
    expect(fs.readFileSync(src, 'utf8')).toBe('fake-exe')
  })
})
