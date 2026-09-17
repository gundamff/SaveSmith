import { locale } from '@host/i18n'
import type { MessageTree } from '@host/i18n/zh'

export const zh: MessageTree = {
  resources: {
    playFaction: '当前势力',
    factionFallback: '势力',
    gold: '资金',
    supply: '补给',
    prestige: '威望',
    economics: '经济等级',
    playMonth: '游戏月',
    maxAll: '一键拉满（资金/补给/威望）',
    missing: '当前存档缺少该字段'
  },
  planets: {
    warn: '修改所属势力可能影响地图与剧情，请先备份',
    maxAll: '防御/总部拉满到上限',
    count: '共 {0} 颗',
    planet: '星球',
    planetFallback: '星球#{0}',
    faction: '所属势力',
    defense: '防御',
    resistance: '抵抗',
    labour: '劳工',
    hq: '总部等级',
    buildings: '建筑'
  },
  common: {
    loading: '正在加载…'
  },
  commanders: {
    maxed: '已拉满 {0} 名指挥官',
    maxedMine: '已拉满己方 {0} 名指挥官',
    maxAll: '全部拉满（经验/属性/星级）',
    maxAllMine: '一键拉满己方',
    count: '共 {0} 人',
    page: '第 {0}/{1} 页',
    filterMine: '仅己方',
    filterAll: '全部势力',
    searchPlaceholder: '搜索姓名或编号',
    faction: '阵营',
    factionUnknown: '未编队',
    factionHint: '阵营由舰队归属（及势力领袖）推断；「仅己方」= 当前势力舰队上的指挥官。',
    name: '姓名',
    nameFallback: '指挥官#{0}',
    exp: '经验',
    admin: '内政',
    military: '军事',
    intellect: '智力',
    breeding: '血统',
    star: '星级',
    skills: '技能芯片',
    skillSlot: '芯片{0}',
    skillsHint: 'Skills 为最多 6 个技能芯片 ID（0=空）。天赋 / 战略 / 战术取自角色表，见左侧只读列。',
    talent: '天赋',
    strategy: '战略',
    tactics: '战术',
    none: '—'
  },
  fleets: {
    noAdd: '一期只改已有舰队槽，不新增或删除舰队/单位槽',
    count: '共 {0} 支',
    filterMine: '仅己方',
    filterAll: '全部势力',
    loading: '正在整理舰队列表…',
    page: '第 {0}/{1} 页',
    fleet: '舰队',
    faction: '势力',
    factionFallback: '势力#{0}',
    commander: '指挥官',
    flagship: '旗舰',
    units: '单位槽',
    slot: '槽 {0}',
    empty: '空',
    unitFallback: '单位#{0}',
    type: '型号',
    field: '字段 {0}',
    level: '等级',
    power: '战力',
    energy: '能量',
    tupleHint: '单位槽数字依次为：等级、战力、能量（后两项对应单位表 Power/Energy；等级在本档常为 0）'
  },
  unlock: {
    unlockAll: '解锁全部已知项',
    unlockedAll: '已解锁全部已知项',
    empty: '当前势力没有可识别的解锁项',
    count: '已解锁 {0}/{1}',
    hint: '下列开关来自当前势力存档中的 Unlocked 字段；勾选表示已解锁。',
    alienLabel: '外星内容解锁',
    alienHint: '对应存档字段 AlienUnlocked：勾选后，当前势力视为已解锁外星相关单位/科技等内容。',
    genericHint: '存档字段：{0}'
  },
  collection: {
    maxed: '图鉴已拉满（请用顶部保存写入）',
    maxAll: '一键拉满',
    useHostSave: '图鉴改动请通过顶部「保存」写入 config.cg2',
    missing: '未载入 config.cg2，无法编辑图鉴',
    commanders: '指挥官图鉴',
    units: '单位图鉴',
    events: '事件图鉴',
    fallback: '#{0}'
  },
  error: {
    UNKNOWN_ACTION: '未知动作：{0}'
  }
}

export const en: MessageTree = {
  resources: {
    playFaction: 'Play faction',
    factionFallback: 'Faction',
    gold: 'Gold',
    supply: 'Supply',
    prestige: 'Prestige',
    economics: 'Economy level',
    playMonth: 'Month',
    maxAll: 'Max gold / supply / prestige',
    missing: 'This field is missing from the save'
  },
  planets: {
    warn: 'Changing ownership may affect the map or story. Back up first.',
    maxAll: 'Max defense / HQ to cap',
    count: '{0} planets',
    planet: 'Planet',
    planetFallback: 'Planet #{0}',
    faction: 'Owner',
    defense: 'Defense',
    resistance: 'Resistance',
    labour: 'Labour',
    hq: 'HQ level',
    buildings: 'Buildings'
  },
  common: {
    loading: 'Loading…'
  },
  commanders: {
    maxed: 'Maxed {0} commanders',
    maxedMine: 'Maxed {0} commanders of your faction',
    maxAll: 'Max exp / stats / stars',
    maxAllMine: 'Max my faction',
    count: '{0} commanders',
    page: 'Page {0}/{1}',
    filterMine: 'My faction',
    filterAll: 'All factions',
    searchPlaceholder: 'Search name or ID',
    faction: 'Faction',
    factionUnknown: 'Unassigned',
    factionHint:
      'Faction is inferred from fleet assignment (and faction leaders). “My faction” = commanders on your fleets.',
    name: 'Name',
    nameFallback: 'Commander #{0}',
    exp: 'XP',
    admin: 'Admin',
    military: 'Military',
    intellect: 'Intellect',
    breeding: 'Breeding',
    star: 'Star',
    skills: 'Skill chips',
    skillSlot: 'Chip {0}',
    skillsHint:
      'Skills holds up to 6 skill-chip IDs (0 = empty). Talent / Strategy / Tactics come from the commander table (read-only columns).',
    talent: 'Talent',
    strategy: 'Strategy',
    tactics: 'Tactics',
    none: '—'
  },
  fleets: {
    noAdd: 'Phase 1 edits existing fleet slots only — no add/delete of fleets or unit slots',
    count: '{0} fleets',
    filterMine: 'My faction',
    filterAll: 'All factions',
    loading: 'Building fleet list…',
    page: 'Page {0}/{1}',
    fleet: 'Fleet',
    faction: 'Faction',
    factionFallback: 'Faction #{0}',
    commander: 'Commander',
    flagship: 'Flagship',
    units: 'Unit slots',
    slot: 'Slot {0}',
    empty: 'Empty',
    unitFallback: 'Unit #{0}',
    type: 'Type',
    field: 'Field {0}',
    level: 'Level',
    power: 'Power',
    energy: 'Energy',
    tupleHint:
      'Unit slot numbers are Level, Power, Energy (last two match UnitTypeData Power/Energy; Level is often 0 in this save)'
  },
  unlock: {
    unlockAll: 'Unlock all known flags',
    unlockedAll: 'All known unlocks enabled',
    empty: 'No recognizable unlock flags for this faction',
    count: 'Unlocked {0}/{1}',
    hint: 'These switches come from Unlocked fields on the play faction. Checked means unlocked.',
    alienLabel: 'Alien content unlock',
    alienHint:
      'Save field AlienUnlocked: when checked, this faction is treated as having unlocked alien units/tech.',
    genericHint: 'Save field: {0}'
  },
  collection: {
    maxed: 'Collection maxed (use the host Save button)',
    maxAll: 'Max collection',
    useHostSave: 'Collection changes are written by the host Save button to config.cg2',
    missing: 'config.cg2 was not loaded; collection cannot be edited',
    commanders: 'Commanders',
    units: 'Units',
    events: 'Events',
    fallback: '#{0}'
  },
  error: {
    UNKNOWN_ACTION: 'Unknown action: {0}'
  }
}

const catalogs: Record<'zh' | 'en', MessageTree> = { zh, en }

function lookup(tree: MessageTree, path: string): string | undefined {
  const parts = path.split('.')
  let cur: string | MessageTree | undefined = tree
  for (const p of parts) {
    if (!cur || typeof cur === 'string') return undefined
    cur = cur[p]
  }
  return typeof cur === 'string' ? cur : undefined
}

/** In-tab copy; follows host locale, not host t() */
export function t(key: string, ...args: Array<string | number>): string {
  void locale.value
  const raw = lookup(catalogs[locale.value], key) ?? lookup(catalogs.zh, key) ?? key
  return raw.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ''))
}

export function translateError(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const e = err as { code: string; args?: Array<string | number>; message?: string }
    if (e.code && lookup(catalogs.zh, `error.${e.code}`)) {
      return t(`error.${e.code}`, ...(e.args ?? []))
    }
  }
  return err instanceof Error ? err.message : String(err)
}
