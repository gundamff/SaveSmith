import { describe, expect, it } from 'vitest'
import { ModuleError } from '@sdk/error'
import { locale, translateError } from '@host/i18n'

const codes = [
  'PBZ_BOSS_DIFFICULTY_UNKNOWN',
  'PBZ_BOSS_DIFFICULTY_MISSING',
  'PBZ_BOSS_DIFFICULTY_CONFLICT'
] as const

describe('PBZ boss difficulty error i18n', () => {
  for (const lang of ['zh', 'en'] as const) {
    it(`translates all codes in ${lang} without returning the bare code`, () => {
      locale.value = lang
      for (const code of codes) {
        const message = translateError(new ModuleError(code, ['A', 'B', 'C']))
        expect(message).not.toBe(code)
        expect(message.length).toBeGreaterThan(0)
      }
    })
  }
})
