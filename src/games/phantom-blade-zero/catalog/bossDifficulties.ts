import { locale } from '../../../host/i18n'
import rows from './bossDifficulties.json'

export interface PbzBossDifficulty {
  readonly key: string
  readonly zh: string
  readonly en: string
  readonly order: number
}

export const pbzBossDifficulties: readonly PbzBossDifficulty[] = Object.freeze(
  rows.map((row) => Object.freeze({ ...row })),
)

const byKey = new Map(pbzBossDifficulties.map((row) => [row.key, row]))

export function getPbzBossDifficulty(key: string): PbzBossDifficulty | undefined {
  return byKey.get(key)
}

export function listPbzBossDifficulties(): readonly PbzBossDifficulty[] {
  return [...pbzBossDifficulties].sort(
    (a, b) => a.order - b.order || a.key.localeCompare(b.key),
  )
}

export function pbzBossDifficultyName(
  key: string,
  language: 'zh' | 'en' = locale.value === 'en' ? 'en' : 'zh',
): string {
  const row = byKey.get(key)
  if (!row) return key
  if (language === 'en') return row.en || row.zh || key
  return row.zh || row.en || key
}
