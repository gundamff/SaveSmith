import { readFileSync } from 'node:fs'
import { decryptSvhd } from '../src/games/final-fantasy-resonance/crypto/svhd'
import { getInt, parseGvasIndex } from '../src/games/final-fantasy-resonance/model/gvasIndex'

const path = process.env.FFR_SAVE
if (!path) throw new Error('FFR_SAVE')
const { plain } = decryptSvhd(new Uint8Array(readFileSync(path)))
const index = parseGvasIndex(plain)
const keys = [...index.fields.keys()].filter(
  (k) =>
    /money|Money|Gil|Level|Experience|ItemId|Num|Mastery|Awaken|Tablet|Escape|PlayTime|MRP/i.test(k) &&
    !k.includes('{removed}')
)
keys.sort()
for (const k of keys.slice(0, 80)) {
  try {
    console.log(k, '=', getInt(index, plain, k))
  } catch {
    console.log(k, '(err)')
  }
}
console.log('arrays', [...index.arrays.keys()].filter((k) => /invent|unit|vision|artifact/i.test(k)))
console.log('maps', [...index.maps.keys()].filter((k) => /artifact|Map|perMap|bestiary|enemy/i.test(k)))
