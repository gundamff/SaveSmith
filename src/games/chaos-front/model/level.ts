/** 驾驶员等级表（Informations.characterLevelTable，反编译验证） */
export const CHARACTER_LEVEL_TABLE: readonly number[] = [0, 300, 1050, 2300, 3800, 5800, 8000, 11000, 15000, 20000]

/** 驾驶员最高等级 */
export const CHARACTER_MAX_LEVEL = 10

/** 驾驶员满级经验 */
export const CHARACTER_MAX_EXP = CHARACTER_LEVEL_TABLE[CHARACTER_LEVEL_TABLE.length - 1]

/** 机体最高等级（+0 ~ +6） */
export const UNIT_MAX_LEVEL = 6

/** 所有 12 张机体等级表中 EXP6 的最大值，≥ 此值必为 +6 */
export const UNIT_EXP6_FALLBACK = 11970

/** 驾驶员 exp → 等级（1..10） */
export function characterLevelForExp(exp: number): number {
  let level = 1
  for (let i = 0; i < CHARACTER_LEVEL_TABLE.length; i++) {
    if (exp >= CHARACTER_LEVEL_TABLE[i]) level = i + 1
  }
  return level
}

/** 驾驶员等级(1..10) → 门槛 exp */
export function characterExpForLevel(level: number): number {
  if (level <= 1) return 0
  return CHARACTER_LEVEL_TABLE[Math.min(level, CHARACTER_LEVEL_TABLE.length) - 1]
}

/** 机体 exp → 等级（0..6），table 为该机型 levelType 对应的 7 档经验（table[lv] 为达到 lv 的门槛，>= 判定，与游戏 GetLevel 一致） */
export function unitLevelForExp(exp: number, table: number[]): number {
  for (let lv = UNIT_MAX_LEVEL; lv >= 0; lv--) {
    if (exp >= table[lv]) return lv
  }
  return 0
}
