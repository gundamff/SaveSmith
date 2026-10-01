import { afterEach, describe, expect, it } from 'vitest'
import { setLocale, t } from '@host/i18n'

afterEach(() => setLocale('zh'))

describe('dead-cells boss rush labels', () => {
  it('localizes every boss rush unlock field', () => {
    setLocale('zh')
    expect(t('dc.bossRush.unlockedGameMode')).toBe('游戏模式')
    expect(t('dc.bossRush.basementUnlock')).toBe('基座')
    expect(t('dc.bossRush.capUnlock')).toBe('披风')
    expect(t('dc.bossRush.materialUnlock')).toBe('材料')
    setLocale('en')
    expect(t('dc.bossRush.basementUnlock')).toBe('Base')
    expect(t('dc.bossRush.weaponUnlock')).toBe('Weapon')
  })
})
