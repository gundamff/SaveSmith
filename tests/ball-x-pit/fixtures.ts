/** Synthetic BinaryFormatter-ish saves for BALL x PIT unit tests. No real player saves. */

function u32le(n: number): Uint8Array {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setInt32(0, n, true)
  return b
}

export function encodeFieldName(name: string): Uint8Array {
  const buf = new Uint8Array(4 + name.length * 2)
  new DataView(buf.buffer).setUint32(0, name.length, true)
  for (let i = 0; i < name.length; i++) {
    buf[4 + i * 2] = name.charCodeAt(i) & 0xff
    buf[4 + i * 2 + 1] = (name.charCodeAt(i) >> 8) & 0xff
  }
  return buf
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((a, p) => a + p.length, 0)
  const out = new Uint8Array(len)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

function i32(n: number): Uint8Array {
  return u32le(n)
}

/** count=5 layout: marker + money + rice + wood + stone inside array */
export function encodeResourcesCount5(r: {
  money: number
  rice: number
  wood: number
  stone: number
}): Uint8Array {
  return concat(
    new Uint8Array([0x08]),
    i32(5),
    i32(4),
    i32(r.money),
    i32(r.rice),
    i32(r.wood),
    i32(r.stone)
  )
}

/** count=4 layout: marker + money + rice + wood; stone follows array */
export function encodeResourcesCount4(r: {
  money: number
  rice: number
  wood: number
  stone: number
}): Uint8Array {
  return concat(
    new Uint8Array([0x08]),
    i32(4),
    i32(4),
    i32(r.money),
    i32(r.rice),
    i32(r.wood),
    i32(r.stone)
  )
}

function encodeHeroEntry(obtained: number, combos: number[]): Uint8Array {
  const count = combos.length + 1 // marker + cells
  const parts: Uint8Array[] = [
    encodeFieldName('NumObtained'),
    i32(obtained),
    encodeFieldName('NumCombos'),
    new Uint8Array([0x08]),
    i32(count),
    i32(4),
    ...combos.map(i32)
  ]
  return concat(...parts)
}

function encodePassiveEntry(obtained: number): Uint8Array {
  return concat(encodeFieldName('NumObtained'), i32(obtained))
}

export interface FixtureOptions {
  resourceLayout?: 'count4' | 'count5'
  resources?: { money: number; rice: number; wood: number; stone: number }
  /** Per-hero NumObtained; each gets a NumCombos row of length heroes.length (marker + heroes-1? see design: count===heroes) */
  heroObtained?: number[]
  /** combo cells after marker; length must be heroCount-1 if count===heroCount with marker inside */
  heroCombos?: number[][]
  passiveObtained?: number[]
}

/**
 * Minimal envelope-valid save.
 * NumCombos count === hero count; values[0] forced to 4 (marker); remaining cells from heroCombos[i].
 */
export function buildMinimalSave(opts: FixtureOptions = {}): Uint8Array {
  const resources = opts.resources ?? { money: 10, rice: 20, wood: 30, stone: 40 }
  const layout = opts.resourceLayout ?? 'count5'
  const heroes = opts.heroObtained ?? [0, 0, 3]
  const passives = opts.passiveObtained ?? [0, 5]
  const n = heroes.length

  const heroParts: Uint8Array[] = []
  for (let i = 0; i < n; i++) {
    const cells = opts.heroCombos?.[i] ?? Array.from({ length: n - 1 }, () => 0)
    if (cells.length !== n - 1) {
      throw new Error(`heroCombos[${i}] must have length ${n - 1}`)
    }
    heroParts.push(encodeHeroEntry(heroes[i]!, cells))
  }

  const resBytes =
    layout === 'count5' ? encodeResourcesCount5(resources) : encodeResourcesCount4(resources)

  return concat(
    new Uint8Array([0x02]),
    encodeFieldName('MetaSaveData, Assembly-CSharp'),
    i32(1),
    encodeFieldName('NumResources'),
    resBytes,
    encodeFieldName('Buildings'),
    i32(0),
    encodeFieldName('Chars'),
    i32(0),
    encodeFieldName('Blueprints'),
    i32(0),
    encodeFieldName('HeroStats'),
    ...heroParts,
    encodeFieldName('PassiveStats'),
    ...passives.map(encodePassiveEntry),
    encodeFieldName('NumHarvests'),
    i32(0),
    encodeFieldName('NumBossBlueprintsDropped'),
    i32(0),
    new Uint8Array([0x05])
  )
}
