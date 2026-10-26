import arcanaJson from './arcana.json'

export type ArcanaEntry = {
  characterGuid: string
  characterKey: string
  arcanaNumber: number
  spellItemID: string
  vaniaGuid: string
  en: string
  zh: string
}

const rows = arcanaJson as ArcanaEntry[]

export const MIN_ARCANA_ENTRIES = 10

export function arcanaReady(): boolean {
  return rows.length >= MIN_ARCANA_ENTRIES && rows.every((r) => Boolean(r.characterGuid))
}

export function arcanaCatalog(): ArcanaEntry[] {
  return [...rows].sort((a, b) => a.arcanaNumber - b.arcanaNumber)
}

export function lookupArcanaName(entry: ArcanaEntry, locale: 'zh' | 'en'): string {
  if (locale === 'zh' && entry.zh.trim()) return entry.zh
  return entry.en || entry.characterKey
}
