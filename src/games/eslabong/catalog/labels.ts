/**
 * Human-readable labels for Eslabong editor (zh-first).
 * Item/relic display names: static zh map first, then English from save Resources.
 * Field / stat / class keys use a static zh map with English fallback.
 */
import { DEFINITION_ZH } from './definitionZh'
import { GROWTH_STYLE_ZH, SKILL_ZH } from './skillZh'
import { listFighters } from '../model/fighters'
import type { ResourceDoc } from '../resource/binary'
import { variantToResValue } from '../resource/variant'

export { GROWTH_STYLE_OPTIONS, GROWTH_STYLE_ZH, SKILL_ZH } from './skillZh'

export interface LabelMaps {
  /** relic definition_id → display_name from save */
  definitions: Record<string, string>
  /** ability res:// path → label */
  skills: Record<string, string>
  /** merc config_id path → class/profession label */
  classes: Record<string, string>
}

const FIELD_ZH: Record<string, string> = {
  // birth
  birth_damage_precise: '出生伤害',
  birth_defense: '出生防御',
  birth_max_hp: '出生生命',
  birth_max_mana: '出生法力',
  birth_max_stamina: '出生耐力',
  birth_move_speed: '出生移速',
  // growth base
  growth_base_damage: '成长伤害基数',
  growth_base_defense: '成长防御基数',
  growth_base_max_hp: '成长生命基数',
  growth_base_max_mana: '成长法力基数',
  growth_base_move_speed: '成长移速基数',
  // career
  career_damage: '生涯伤害',
  career_damage_precise: '生涯伤害(精确)',
  career_defense: '生涯防御',
  career_max_hp: '生涯生命',
  career_max_mana: '生涯法力',
  career_max_stamina: '生涯耐力',
  career_move_speed: '生涯移速',
  // personality
  adaptability: '适应力',
  teamwork_affinity: '团队亲和',
  revenge_factor: '复仇倾向',
  showmanship: '表现欲',
  situational_awareness: '战场意识',
  overconfidence: '自负',
  // AI / tendency
  aggression: '侵略性',
  mistake_chance: '失误率',
  block_chance: '格挡倾向',
  dodge_chance: '闪避倾向',
  parry_mastery: '招架精通',
  // item stats
  hp_flat: '生命(固定)',
  hp_perc: '生命(%)',
  man_flat: '法力(固定)',
  man_perc: '法力(%)',
  sta_flat: '耐力(固定)',
  sta_perc: '耐力(%)',
  def_flat: '防御(固定)',
  def_perc: '防御(%)',
  atk_flat: '攻击(固定)',
  atk_perc: '攻击(%)',
  damage_perc: '伤害(%)',
  damage_taken_perc: '受伤(%)',
  damage_reduction_perc: '减伤(%)',
  basic_damage_perc: '普攻伤害(%)',
  basic_melee_damage_taken_perc: '近战普攻受伤(%)',
  msp_perc: '移速(%)',
  move_speed_perc: '移速(%)',
  cooldown_reduction_perc: '冷却缩减(%)',
  lifesteal_perc: '吸血(%)',
  healing_done_perc: '造成治疗(%)',
  healing_received_perc: '受到治疗(%)',
  heal_max_hp_perc: '治疗量(最大生命%)',
  shield_output_perc: '护盾输出(%)',
  shield_duration_perc: '护盾持续时间(%)',
  mana_cost_reduction_perc: '法力消耗降低(%)',
  stamina_cost_reduction_perc: '耐力消耗降低(%)',
  mana_restore: '回复法力',
  stamina_restore: '回复耐力',
  restore_perc: '回复(%)',
  projectile_speed_perc: '弹道速度(%)',
  projectile_damage_taken_perc: '弹道受伤(%)',
  dash_range_perc: '冲刺距离(%)',
  knockback_distance_perc: '击退距离(%)',
  summon_damage_perc: '召唤物伤害(%)',
  summon_hp_perc: '召唤物生命(%)',
  skeleton_hp_perc: '骷髅生命(%)',
  skeleton_power_perc: '骷髅强度(%)',
  ally_radius: '友方半径',
  duration_sec: '持续时间(秒)',
  hit_window_sec: '判定窗口(秒)',
  idle_required_sec: '待机需求(秒)',
  internal_cooldown_sec: '内置冷却(秒)',
  mark_duration_sec: '标记持续(秒)',
  hp_threshold_perc: '生命阈值(%)',
  required_hits: '所需命中次数'
}

/** Merc config basename / folder → 职业 */
const CLASS_ZH: Record<string, string> = {
  Merc_Monk: '武僧',
  Merc_Hunter: '兽王',
  Merc_EmberPriest: '灰烬牧师',
  Merc_Paladin_Crusader: '惩戒圣骑',
  Merc_Paladin: '圣骑',
  Merc_Necromancer: '死灵法师',
  Merc_Rogue_Spellblade: '法刃游侠',
  Merc_Rogue_Assasin: '刺客',
  Merc_Rogue_Assassin: '刺客',
  Merc_Archmage: '大法师',
  Merc_Astralwing: '星翼',
  Merc_Halberdier: '戟兵',
  Merc_Healer_Cleric: '牧师',
  Merc_Healer_Priest: '祭司',
  Merc_Hierophant: '祭司长',
  Merc_Mage_Chronomaster: '时法师',
  Merc_Mage_Conjurer: '咒法师',
  Merc_Mage_Reaper: '收割法师',
  Merc_Archer_Bowman: '弓箭手',
  Merc_Archer_Crossbowman: '弩手',
  Merc_Archer_Goblin: '哥布林射手',
  Merc_Goblin_Ambusher: '哥布林伏击者',
  Merc_Swordmaster: '剑圣',
  Merc_Minotaur_Stormhorn: '牛头人',
  Merc_Wind_Twister: '风舞者',
  Merc_Timesworn: '时誓者',
  Champions: '冠军',
  Named_Champion: '冠军',
  Named_Thunderclaw_Champion: '雷爪冠军'
}

function titleCaseStem(stem: string): string {
  return stem
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function fieldLabel(key: string): string {
  return FIELD_ZH[key] ?? key
}

export function growthStyleLabel(style: string): string {
  return GROWTH_STYLE_ZH[style] ?? style
}

export function skillStem(path: string): string {
  const base = path.replace(/\\/g, '/').split('/').pop() ?? path
  return base.replace(/\.tres$/i, '')
}

export function skillLabel(path: string, maps?: LabelMaps): string {
  if (maps?.skills[path]) return maps.skills[path]!
  const stem = skillStem(path)
  return SKILL_ZH[stem] ?? titleCaseStem(stem)
}

export function definitionLabel(id: string, maps?: LabelMaps): string {
  if (DEFINITION_ZH[id]) return DEFINITION_ZH[id]!
  if (maps?.definitions[id]) return maps.definitions[id]!
  return id
}

/** e.g. 生命(固定)+47 */
export function formatStatAmount(statId: string, amount: number): string {
  const label = fieldLabel(statId)
  if (!Number.isFinite(amount)) return label
  if (amount > 0) return `${label}+${amount}`
  return `${label}${amount}`
}

/** List-cell summary: 生命(固定)+47 · 近战普攻受伤(%)-16 */
export function formatStatsSummary(
  stats: ReadonlyArray<{ statId: string; amount: number }>
): string {
  if (stats.length === 0) return ''
  return stats.map((s) => formatStatAmount(s.statId, s.amount)).join(' · ')
}

export function classLabel(configId: string, maps?: LabelMaps): string {
  if (maps?.classes[configId]) return maps.classes[configId]!
  const base = configId.replace(/\\/g, '/').split('/').pop()?.replace(/\.tres$/i, '') ?? configId
  if (CLASS_ZH[base]) return CLASS_ZH[base]!
  if (base.startsWith('Named_Champion')) return '冠军'
  const folder = configId.replace(/\\/g, '/').split('/')
  const parent = folder[folder.length - 2]
  if (parent && CLASS_ZH[parent]) return CLASS_ZH[parent]!
  // Merc_Foo_Bar → try progressive
  const parts = base.split('_')
  for (let i = parts.length; i >= 2; i--) {
    const key = parts.slice(0, i).join('_')
    if (CLASS_ZH[key]) return CLASS_ZH[key]!
  }
  return titleCaseStem(base.replace(/^Merc_/, ''))
}

/** Walk save Resources to collect relic display names + merc class hints. */
export function buildLabelMaps(doc: ResourceDoc): LabelMaps {
  const definitions: Record<string, string> = {}
  const skills: Record<string, string> = { ...Object.fromEntries(
    Object.entries(SKILL_ZH).map(([stem, zh]) => [stem, zh])
  )}
  const classes: Record<string, string> = {}

  for (const res of doc.wire.resources) {
    const props = new Map(res.properties.map((p) => [p.name, variantToResValue(p.value)]))
    const relicId = props.get('relic_id')
    const displayName = props.get('display_name')
    if (typeof relicId === 'string' && typeof displayName === 'string' && displayName.trim()) {
      definitions[relicId] = displayName.trim()
    }
  }

  // Path-keyed skill labels from static stem map + any fighter skill paths
  for (const f of listFighters(doc)) {
    for (const p of Object.values(f.skills)) {
      if (typeof p !== 'string' || !p) continue
      const stem = skillStem(p)
      if (SKILL_ZH[stem]) skills[p] = SKILL_ZH[stem]!
      else if (!skills[p]) skills[p] = titleCaseStem(stem)
    }
    // class from config if we can read it via resource
    const idx = (f._ref as { resourceIndex?: number } | undefined)?.resourceIndex
    if (typeof idx === 'number') {
      const res = doc.wire.resources[idx]
      const cfg = res?.properties.find((p) => p.name === 'config_id')
      const configId = cfg ? variantToResValue(cfg.value) : undefined
      if (typeof configId === 'string' && configId) {
        classes[configId] = classLabel(configId)
      }
    }
  }

  return { definitions, skills, classes }
}
