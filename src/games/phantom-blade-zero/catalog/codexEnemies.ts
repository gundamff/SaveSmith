import { locale } from '../../../host/i18n'
import data from './codexEnemies.json'
import { pbzCodexMapName } from './codexMaps'

export interface PbzCodexEnemy {
  readonly id: string
  readonly zh: string
  readonly zhRevealed: string
  readonly isBoss: boolean
  readonly enemyType: string
  readonly ownMapId: string
  readonly enemyClass: string
  readonly displayOrder: number
  readonly replacedBy?: string
  readonly useReplacement?: boolean
}

export const pbzCodexEnemies: readonly PbzCodexEnemy[] = Object.freeze(
  data.enemies.map((row) => Object.freeze({ ...row }))
)

const byId = new Map(pbzCodexEnemies.map((row) => [row.id, row]))
const byClass = new Map(
  pbzCodexEnemies
    .filter((row) => row.enemyClass)
    .map((row) => [row.enemyClass.toLowerCase(), row])
)

export function listPbzCodexEnemies(): readonly PbzCodexEnemy[] {
  return [...pbzCodexEnemies].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id)
  )
}

export function getPbzCodexEnemyById(id: string): PbzCodexEnemy | undefined {
  return byId.get(id)
}

export function getPbzCodexEnemyByClass(enemyClass: string): PbzCodexEnemy | undefined {
  return byClass.get(enemyClass.toLowerCase())
}

export function isWhitelistedCodexEnemyClass(enemyClass: string): boolean {
  return byClass.has(enemyClass.toLowerCase())
}

export function pbzCodexEnemyName(
  row: PbzCodexEnemy,
  language: 'zh' | 'en' = locale.value === 'en' ? 'en' : 'zh'
): string {
  if (language === 'zh') return row.zh || row.id
  // DT_CodexEnemyDataTable only ships Enemy_CH_Hans_Name on this build; no EN locres keys.
  // Prefer readable blueprint id over inventing English names.
  return row.id.replace(/^BP_Monster_/, '').replace(/_/g, ' ')
}

export function searchPbzCodexEnemies(query: string): readonly PbzCodexEnemy[] {
  const needle = query.trim().toLocaleLowerCase()
  const rows = listPbzCodexEnemies()
  if (!needle) return rows
  return rows.filter((row) => {
    const mapZh = pbzCodexMapName(row.ownMapId, 'zh')
    const mapEn = pbzCodexMapName(row.ownMapId, 'en')
    const enName = pbzCodexEnemyName(row, 'en')
    return [
      row.id,
      row.zh,
      row.zhRevealed,
      row.enemyClass,
      row.ownMapId,
      row.enemyType,
      mapZh,
      mapEn,
      enName
    ].some((v) => v.toLocaleLowerCase().includes(needle))
  })
}
