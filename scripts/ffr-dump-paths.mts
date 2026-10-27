/**
 * Dev probe: decrypt FFR_SAVE and dump top-level / shallow FString property names.
 * Usage: FFR_SAVE=... npx vitest run scripts/ffr-dump-paths.mts  (or tsx)
 */
import { readFileSync } from 'node:fs'
import { decryptSvhd } from '../src/games/final-fantasy-resonance/crypto/svhd'

const path = process.env.FFR_SAVE
if (!path) {
  console.error('set FFR_SAVE')
  process.exit(1)
}

const { plain } = decryptSvhd(new Uint8Array(readFileSync(path)))
const v = new DataView(plain.buffer, plain.byteOffset, plain.byteLength)
let o = 0
const names = new Map<string, number>()

function need(n: number) {
  if (o + n > plain.length) throw new Error('eof')
}
function i32() {
  need(4)
  const x = v.getInt32(o, true)
  o += 4
  return x
}
function fstring(): string {
  const n = i32()
  if (n === 0) return ''
  if (n < 0) {
    const chars = -n
    need(chars * 2)
    const s = new TextDecoder('utf-16le').decode(plain.subarray(o, o + chars * 2 - 2))
    o += chars * 2
    return s
  }
  need(n)
  const s = new TextDecoder('utf-8').decode(plain.subarray(o, o + n - 1))
  o += n
  return s
}

// Skip GVAS header loosely: magic + package versions + engine + custom versions + save type
if (String.fromCharCode(plain[0]!, plain[1]!, plain[2]!, plain[3]!) !== 'GVAS') throw new Error('not gvas')
o = 4
i32()
i32()
i32() // package file version fields vary; best-effort
// UE5: more header — scan for first FString that looks like a property by searching Null-terminated patterns
// Simpler: collect all ASCII FStrings with length 2..64
o = 4
while (o + 8 < plain.length) {
  const n = v.getInt32(o, true)
  if (n >= 2 && n <= 80 && o + 4 + n <= plain.length) {
    const slice = plain.subarray(o + 4, o + 4 + n)
    if (slice[n - 1] === 0) {
      let ok = true
      for (let i = 0; i < n - 1; i++) {
        const c = slice[i]!
        if (c < 0x20 || c > 0x7e) {
          ok = false
          break
        }
      }
      if (ok) {
        const s = new TextDecoder().decode(slice.subarray(0, n - 1))
        if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)) {
          names.set(s, (names.get(s) ?? 0) + 1)
          o += 4 + n
          continue
        }
      }
    }
  }
  o++
}

const sorted = [...names.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
for (const [s, c] of sorted.slice(0, 120)) console.log(c, s)
console.log('--- interesting ---')
for (const [s, c] of sorted) {
  if (/gil|money|gold|invent|unit|artifact|map|player|tablet|level|exp|vision|item/i.test(s)) {
    console.log(c, s)
  }
}
