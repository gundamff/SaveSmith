import { ModuleError } from '@sdk/error'
import { decryptSaveDat, encryptSaveDat } from '../crypto/aesEcb'
import { parseSavedData } from './savedData'

export const SAVE_FILE = 'SaveData.dat'

export type StringBag = Map<string, string>

export function parseBagFromPlain(plainUtf8: string): { bag: StringBag; rawPlain: string } {
  let obj: unknown
  try {
    obj = JSON.parse(plainUtf8)
  } catch {
    throw new ModuleError('INVALID_FORMAT', ['bag'])
  }
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new ModuleError('INVALID_FORMAT', ['bag'])
  }
  const bag: StringBag = new Map()
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    const v = (obj as Record<string, unknown>)[key]
    if (typeof v === 'string') bag.set(key, v)
    else bag.set(key, JSON.stringify(v))
  }
  return { bag, rawPlain: plainUtf8 }
}

export function openBagFromCipher(cipher: Uint8Array): {
  bag: StringBag
  rawPlain: string
  originalCipher: Uint8Array
} {
  const originalCipher = new Uint8Array(cipher)
  const plain = new TextDecoder().decode(decryptSaveDat(cipher))
  const { bag, rawPlain } = parseBagFromPlain(plain)
  return { bag, rawPlain, originalCipher }
}

export function readSavedDataJson(bag: StringBag, slotId: string): string {
  const key = `${slotId}_Data`
  const v = bag.get(key)
  if (v === undefined) throw new ModuleError('MISSING_FIELD', [key])
  return v
}

export function listSlotMetas(bag: StringBag): Array<{
  id: string
  kind: 'manual' | 'auto'
  savedName: string
  round: number
  timeMs: number
}> {
  const metas: Array<{
    id: string
    kind: 'manual' | 'auto'
    savedName: string
    round: number
    timeMs: number
  }> = []

  const pushForIds = (ids: string[], kind: 'manual' | 'auto') => {
    for (const id of ids) {
      const json = readSavedDataJson(bag, id)
      const parsed = parseSavedData(json)
      const timeMs = Number(parsed.Time)
      metas.push({
        id,
        kind,
        savedName: parsed.SavedName,
        round: parsed.Round,
        timeMs: Number.isFinite(timeMs) ? timeMs : 0
      })
    }
  }

  let manualIds: string[] = []
  let autoIds: string[] = []
  try {
    manualIds = JSON.parse(bag.get('_saveKeyStr') ?? '[]') as string[]
    autoIds = JSON.parse(bag.get('_autoSaveStr') ?? '[]') as string[]
  } catch {
    throw new ModuleError('INVALID_FORMAT', ['slot lists'])
  }
  if (!Array.isArray(manualIds) || !Array.isArray(autoIds)) {
    throw new ModuleError('INVALID_FORMAT', ['slot lists'])
  }
  pushForIds(manualIds, 'manual')
  pushForIds(autoIds, 'auto')
  return metas
}

export { parseSavedData } from './savedData'

export function setSlotSavedData(bag: StringBag, slotId: string, savedDataJson: string): void {
  bag.set(`${slotId}_Data`, savedDataJson)
}

function findJsonStringEnd(text: string, openQuoteIndex: number): number {
  if (text[openQuoteIndex] !== '"') throw new ModuleError('INVALID_FORMAT', ['json string'])
  let i = openQuoteIndex + 1
  while (i < text.length) {
    const c = text[i]!
    if (c === '\\') {
      i += 2
      continue
    }
    if (c === '"') return i + 1
    i++
  }
  throw new ModuleError('INVALID_FORMAT', ['json string'])
}

function replaceJsonStringProperty(plain: string, propKey: string, unescapedStringValue: string): string {
  const keyToken = JSON.stringify(propKey)
  const idx = plain.indexOf(keyToken)
  if (idx < 0) throw new ModuleError('MISSING_FIELD', [propKey])
  let i = idx + keyToken.length
  while (i < plain.length && /\s/.test(plain[i]!)) i++
  if (plain[i] !== ':') throw new ModuleError('INVALID_FORMAT', [propKey])
  i++
  while (i < plain.length && /\s/.test(plain[i]!)) i++
  if (plain[i] !== '"') throw new ModuleError('INVALID_FORMAT', [propKey])
  const end = findJsonStringEnd(plain, i)
  const escaped = JSON.stringify(unescapedStringValue)
  return plain.slice(0, i) + escaped + plain.slice(end)
}

export function sealBag(args: {
  bag: StringBag
  rawPlain: string
  originalCipher: Uint8Array
  dirtySlotIds: ReadonlySet<string>
}): Uint8Array {
  if (args.dirtySlotIds.size === 0) {
    return new Uint8Array(args.originalCipher)
  }
  let plain = args.rawPlain
  for (const slotId of args.dirtySlotIds) {
    const dataKey = `${slotId}_Data`
    const newValue = args.bag.get(dataKey)
    if (newValue === undefined) throw new ModuleError('MISSING_FIELD', [dataKey])
    plain = replaceJsonStringProperty(plain, dataKey, newValue)
  }
  return encryptSaveDat(new TextEncoder().encode(plain))
}