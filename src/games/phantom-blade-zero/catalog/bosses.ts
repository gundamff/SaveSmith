export type BossLocale = 'zh' | 'en'

interface BossName {
  zh: string
  en: string
}

/** Display names for known BP_Monster_* boss record keys. Unlisted IDs fall back to a readable stub. */
const BOSS_NAMES: Record<string, BossName> = {
  BP_Monster_PengMeng_Axe: { zh: '斧老大：彭猛', en: 'Peng Meng' },
  BP_Monster_MobMan_Elite_Sword: { zh: '痴狂暴徒：残钢', en: 'Can Gang' },
  BP_Monster_MoTian_LongZhu_01: { zh: '金面具黑衣人', en: 'Golden Mask' },
  BP_Monster_AHua_GuiTouDao: { zh: '阿花', en: 'A Hua' },
  BP_Monster_HookMan: { zh: '追命', en: 'Hook Man' },
  BP_Monster_HookMan_P2: { zh: '追命（二阶段）', en: 'Hook Man (P2)' },
  BP_Monster_HookMan_HorseCartCombat: { zh: '追命（马车）', en: 'Hook Man (Cart)' },
  BP_Monster_ZuoShang: { zh: '座上', en: 'Zuo Shang' }
}

export function getBossDisplayName(bossId: string, locale: BossLocale): string {
  const hit = BOSS_NAMES[bossId]
  if (hit) return locale === 'zh' ? hit.zh : hit.en
  return bossId.replace(/^BP_Monster_/, '').replace(/_/g, ' ')
}
