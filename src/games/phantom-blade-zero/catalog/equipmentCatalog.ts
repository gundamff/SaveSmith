import { locale, t } from '../../../host/i18n'
import equipment from './equipment.json'
import { humanizePbzItemId } from './index'

export type PbzEquipmentCategory =
  | 'main-weapon'
  | 'phantom-weapon'
  | 'accessory'

export interface PbzEquipmentItem {
  readonly id: string
  readonly category: PbzEquipmentCategory
  readonly zh: string
  readonly en: string
  readonly maxLevel: number
}

/** When a weapon/phantom table row has no maxLevel, clamp edits here. */
export const DEFAULT_WEAPON_MAX_LEVEL = 20

export const pbzEquipmentCatalog: readonly PbzEquipmentItem[] = Object.freeze(
  equipment.map((item) =>
    Object.freeze({
      id: item.id,
      category: item.category as PbzEquipmentCategory,
      zh: item.zh,
      en: item.en,
      maxLevel: item.maxLevel,
    }),
  ),
)

const byId = new Map(pbzEquipmentCatalog.map((item) => [item.id, item]))

export function getPbzEquipment(id: string): PbzEquipmentItem | undefined {
  return byId.get(id)
}

export function pbzEquipmentName(
  item: PbzEquipmentItem,
  language: 'zh' | 'en' = locale.value,
): string {
  if (language === 'zh') {
    return item.zh || item.en || `${t('pbz.resources.unknownItem')} (${item.id})`
  }
  if (item.en) return item.en
  if (item.zh) return humanizePbzItemId(item.id)
  return `${t('pbz.resources.unknownItem')} (${item.id})`
}

export function searchPbzEquipment(
  category: PbzEquipmentCategory,
  query: string,
): PbzEquipmentItem[] {
  const needle = query.trim().toLocaleLowerCase()
  return pbzEquipmentCatalog.filter(
    (row) =>
      row.category === category &&
      (!needle ||
        [row.id, row.zh, row.en].some((value) =>
          value.toLocaleLowerCase().includes(needle),
        )),
  )
}
