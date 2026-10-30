import { locale, t } from '../../../host/i18n'
import items from './items.json'

export type PbzItemCategory = 'weapon-material' | 'consumable'

export interface PbzCatalogItem {
  readonly id: string
  readonly category: PbzItemCategory
  readonly zh: string
  readonly en: string
  readonly maxAmount: number
}

export const pbzCatalog: readonly PbzCatalogItem[] = Object.freeze(
  items.map((item) => Object.freeze({
    ...item,
    category: item.category as PbzItemCategory,
  }))
)

const itemsById = new Map(pbzCatalog.map((item) => [item.id, item]))

export function getPbzItem(id: string): PbzCatalogItem | undefined {
  return itemsById.get(id)
}

export function pbzItemName(
  item: PbzCatalogItem,
  language: 'zh' | 'en' = locale.value
): string {
  return language === 'zh'
    ? item.zh || item.en || `${t('pbz.resources.unknownItem')} (${item.id})`
    : item.en || item.zh || `${t('pbz.resources.unknownItem')} (${item.id})`
}

export function searchPbzItems(
  category: PbzItemCategory,
  query: string
): PbzCatalogItem[] {
  const needle = query.trim().toLocaleLowerCase()
  return pbzCatalog.filter((row) =>
    row.category === category &&
    (!needle || [row.id, row.zh, row.en].some((value) =>
      value.toLocaleLowerCase().includes(needle)
    ))
  )
}
