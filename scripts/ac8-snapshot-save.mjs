/**
 * Snapshot key Campaign.sav fields to JSON (no full binary).
 * Usage: node scripts/ac8-snapshot-save.mjs <Campaign.sav> [out.json]
 *
 * License note: output is derived ID lists / scalars from a local file analysis.
 * Do not commit third-party full .sav binaries into the public repo.
 */
import fs from 'fs'
import path from 'path'

function findScalar(buf, name, type) {
  const needle = Buffer.from(name + '\0')
  for (let i = 4; i < buf.length - needle.length; i++) {
    if (!buf.subarray(i, i + needle.length).equals(needle)) continue
    if (buf.readInt32LE(i - 4) !== needle.length) continue
    let c = i + needle.length
    const tlen = buf.readInt32LE(c)
    const t = buf.toString('ascii', c + 4, c + 4 + tlen - 1)
    if (type && t !== type) continue
    c += 4 + tlen + 4
    const size = buf.readInt32LE(c)
    c += 5
    if (t === 'UInt64Property' && size === 8) return buf.readBigUInt64LE(c).toString()
    if (t === 'UInt32Property' && size === 4) return buf.readUInt32LE(c)
    if (t === 'IntProperty' && size === 4) return buf.readInt32LE(c)
  }
  return null
}

function findNumericArray(buf, name, inner) {
  const needle = Buffer.from(name + '\0')
  for (let i = 4; i < buf.length - needle.length; i++) {
    if (!buf.subarray(i, i + needle.length).equals(needle)) continue
    if (buf.readInt32LE(i - 4) !== needle.length) continue
    let c = i + needle.length
    const tlen = buf.readInt32LE(c)
    if (buf.toString('ascii', c + 4, c + 4 + tlen - 1) !== 'ArrayProperty') continue
    c += 4 + tlen + 4
    const ilen = buf.readInt32LE(c)
    const inn = buf.toString('ascii', c + 4, c + 4 + ilen - 1)
    if (inn !== inner) continue
    c += 4 + ilen + 4
    const dataSize = buf.readInt32LE(c)
    c += 5
    const count = buf.readInt32LE(c)
    c += 4
    if (count < 0 || dataSize !== 4 + count * 4) continue
    const ids = []
    for (let k = 0; k < count; k++) {
      ids.push(inner === 'IntProperty' ? buf.readInt32LE(c + k * 4) : buf.readUInt32LE(c + k * 4))
    }
    return { inner, count, ids: [...ids].sort((a, b) => a - b) }
  }
  return null
}

function snapshot(buf, sourceLabel) {
  const arrays = [
    ['UnlockedFreeMissionIDs', 'IntProperty'],
    ['NewlyUnlockedFreeMissionIDs', 'IntProperty'],
    ['UnlockedHangarSituationIDs', 'IntProperty'],
    ['NewlyUnlockedHangarSituationIDs', 'IntProperty'],
    ['UnlockedAircraftTreeNodeIDs', 'UInt32Property'],
    ['NewlyUnlockedAircraftTreeNodeIDs', 'UInt32Property'],
    ['UnlockedSkinIdList', 'UInt32Property'],
    ['NewlyUnlockedSkinIdList', 'UInt32Property'],
    ['UnlockedEmblemIdList', 'UInt32Property'],
    ['NewlyUnlockedEmblemIdList', 'UInt32Property'],
    ['UnlockedMedalIdList', 'UInt32Property'],
    ['NewlyUnlockedMedalIdList', 'UInt32Property'],
    ['NewlyOwnedAircrafts', 'UInt32Property']
  ]
  const out = {
    note: 'Derived field snapshot from local Campaign.sav analysis. Not a redistributed save binary.',
    sourceLabel,
    fileSize: buf.length,
    currentMrp: findScalar(buf, 'CurrentMRP', 'UInt64Property'),
    totalMrp: findScalar(buf, 'TotalMRP', 'UInt64Property'),
    featureFlagMask: findScalar(buf, 'FeatureFlagMask', 'UInt32Property'),
    featureFlagMaskHex:
      findScalar(buf, 'FeatureFlagMask', 'UInt32Property') != null
        ? '0x' + Number(findScalar(buf, 'FeatureFlagMask', 'UInt32Property')).toString(16).toUpperCase()
        : null,
    completionCount: findScalar(buf, 'CompletionCount', 'UInt32Property'),
    lastCompletedMissionId: findScalar(buf, 'LastCompletedMissionID', 'IntProperty'),
    lastPlayedMissionId: findScalar(buf, 'LastPlayedMissionID', 'IntProperty'),
    arrays: {}
  }
  for (const [name, inner] of arrays) {
    const a = findNumericArray(buf, name, inner)
    out.arrays[name] = a ? { inner: a.inner, count: a.count, ids: a.ids } : null
  }
  return out
}

const inPath = process.argv[2]
if (!inPath) {
  console.error('Usage: node scripts/ac8-snapshot-save.mjs <Campaign.sav> [out.json]')
  process.exit(1)
}
const buf = fs.readFileSync(inPath)
const snap = snapshot(buf, path.basename(inPath))
const json = JSON.stringify(snap, null, 2) + '\n'
const outPath = process.argv[3]
if (outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, json)
  console.log('wrote', outPath, 'arrays', Object.fromEntries(Object.entries(snap.arrays).map(([k, v]) => [k, v?.count ?? null])))
} else {
  process.stdout.write(json)
}
