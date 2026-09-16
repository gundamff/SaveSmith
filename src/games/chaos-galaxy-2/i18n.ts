import { locale } from '@host/i18n'
import type { MessageTree } from '@host/i18n/zh'

export const zh: MessageTree = {
  resources: {
    playFaction: '当前势力',
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
  commanders: {
    maxed: '已拉满 {0} 名指挥官',
    maxAll: '全部拉满（经验/属性/星级）',
    count: '共 {0} 人',
    name: '姓名',
    nameFallback: '指挥官#{0}',
    exp: '经验',
    admin: '内政',
    military: '军事',
    intellect: '智力',
    breeding: '血统',
    star: '星级',
    skills: '技能'
  },
  fleets: {
    noAdd: '一期只改已有舰队槽，不新增或删除舰队/单位槽',
    count: '共 {0} 支',
    fleet: '舰队',
    faction: '势力',
    commander: '指挥官',
    flagship: '旗舰',
    units: '单位槽',
    slot: '槽 {0}',
    empty: '空',
    unitFallback: '单位#{0}',
    type: '型号',
    field: '字段 {0}'
  },
  unlock: {
    unlockAll: '解锁全部已知项',
    unlockedAll: '已解锁全部已知项',
    empty: '当前势力没有可识别的 Unlocked 字段',
    count: '已解锁 {0}/{1}'
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
  commanders: {
    maxed: 'Maxed {0} commanders',
    maxAll: 'Max exp / stats / stars',
    count: '{0} commanders',
    name: 'Name',
    nameFallback: 'Commander #{0}',
    exp: 'XP',
    admin: 'Admin',
    military: 'Military',
    intellect: 'Intellect',
    breeding: 'Breeding',
    star: 'Star',
    skills: 'Skills'
  },
  fleets: {
    noAdd: 'Phase 1 edits existing fleet slots only — no add/delete of fleets or unit slots',
    count: '{0} fleets',
    fleet: 'Fleet',
    faction: 'Faction',
    commander: 'Commander',
    flagship: 'Flagship',
    units: 'Unit slots',
    slot: 'Slot {0}',
    empty: 'Empty',
    unitFallback: 'Unit #{0}',
    type: 'Type',
    field: 'Field {0}'
  },
  unlock: {
    unlockAll: 'Unlock all known flags',
    unlockedAll: 'All known unlocks enabled',
    empty: 'No recognizable Unlocked fields for this faction',
    count: 'Unlocked {0}/{1}'
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
