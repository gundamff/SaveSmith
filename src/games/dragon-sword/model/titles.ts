/**
 * Account title ids → tb_title category/bit.
 *
 * Public format: CATEGORY = title_id / 64, bit = title_id % 64.
 * Writes must change BIT_FIELD only; FAV_BIT_FIELD is the favourite/displayed title.
 * https://github.com/gfriloux/dragonsword-save-editor/tree/main/docs
 */
import { hasBit, setBit } from './bitmask'
import type { TitleRow } from './types'
import titlesJson from '../catalog/titles.json'

export interface TitleDef {
  titleId: number
  name: { zh: string; en: string }
}

export const titleCatalog: TitleDef[] = titlesJson as TitleDef[]

export function titleBit(titleId: number): { category: number; bit: number } {
  return {
    category: Math.floor(titleId / 64),
    bit: titleId % 64
  }
}

export function titleKnown(titles: TitleRow[], titleId: number): boolean {
  const { category, bit } = titleBit(titleId)
  const row = titles.find((t) => t.category === category)
  return row ? hasBit(row.bitField, bit) : false
}

/** OR (unlock) or clear (lock) one title bit. Never mutates favBitField. */
export function setTitleKnown(titles: TitleRow[], titleId: number, known: boolean): void {
  const { category, bit } = titleBit(titleId)
  let row = titles.find((t) => t.category === category)
  if (!row) {
    if (!known) return
    row = { category, bitField: '0', favBitField: '0' }
    titles.push(row)
  }
  row.bitField = setBit(row.bitField, bit, known)
}
