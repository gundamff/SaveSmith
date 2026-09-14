import { locale } from '@host/i18n'
import type { MessageTree } from '@host/i18n/zh'

export const zh: MessageTree = {
  tabs: {
    formation: '编队'
  },
  resources: {
    relWarn: '关系值影响剧情走向，修改可能跳过/触发特定事件',
    timeWarn: '结局与游戏时间相关；只改日期可能使剧情进度与日历对不上',
    historyYear: '委员会历 · 年',
    historyMonth: '月',
    historyDay: '日',
    credit: '信用点',
    prestige: '威望',
    star: '星级',
    medal: '勋章 · {0}',
    relationship: '关系 · {0}',
    maxAll: '一键拉满（信用/威望/星级）',
    factionFallback: '势力{0}'
  },
  planets: {
    warn: '修改所属势力会同步 FactionData.planets；乱改可能影响地图与剧情',
    maxAll: '全部拉满（当前四维）',
    count: '共 {0} 颗',
    planet: '星球',
    planetFallback: '星球#{0}',
    faction: '所属势力',
    factionFallback: '势力{0}',
    economics: '经济',
    industry: '工业',
    defense: '防御',
    stability: '稳定',
    maxTune: '上限微调',
    econShort: '经',
    indShort: '工'
  },
  formation: {
    hint: '可先把机体拖上格子，再把驾驶员拖到机体上；也可在下方待上阵区先分配再上阵。保存前上阵机体必须有驾驶员。',
    undeploy: '下阵选中',
    selected: '已选：{0} · {1}',
    pilot: '驾驶员',
    noPilot: '（无驾驶员）',
    col: '列 {0}',
    row: '行 {0}',
    empty: '空',
    bench: '未上阵（{0}）· 可拖入下阵',
    benchUnits: '待上阵机体（{0}）· 拖到格子上阵，也可拖回此处下阵',
    benchPilots: '待上阵驾驶员（{0}）· 拖到机体上分配',
    needPilot: '需先分配驾驶员',
    noFreePilots: '暂无空闲驾驶员',
    dropPilotNeedUnit: '请把驾驶员拖到已有机体上',
    allDeployed: '全部已上阵',
    none: '—',
    detailEmpty: '点击机体图标或驾驶员头像查看详情',
    focusUnit: '机体信息',
    focusPilot: '驾驶员信息',
    secWeapons: '武器',
    secAbilities: '机体能力',
    secItems: '已装装备',
    emptySlot: '空槽',
    equip: '装上',
    unequip: '卸下',
    inventory: '仓库（点击装上）',
    secPilot: '驾驶员',
    secSkills: '技能',
    secTalents: '天赋',
    statAgility: '敏捷',
    statMove: '移动',
    statLimit: '限界',
    statShoot: '射击',
    statManeuver: '机动',
    statCommand: '指挥',
    statMelee: '格斗',
    statReaction: '反应'
  },
  units: {
    unknownType: '未知机型#{0}',
    maxed: '已拉满 {0} 台',
    added: '已添加',
    warships: '战舰',
    large: '大型机体',
    small: '小型机体',
    maxAll: '全部 +6',
    add: '添加机体',
    count: '共 {0} 台',
    name: '名称',
    custom: '改装',
    pilot: '驾驶员',
    level: '等级',
    exp: '经验',
    items: '装备',
    actions: '操作',
    removeConfirm: '确认删除该机体？（装备归还仓库）',
    remove: '删除',
    addTitle: '添加机体',
    model: '型号',
    modelPlaceholder: '选择型号（可搜索）',
    initLevel: '初始等级',
    cancel: '取消',
    confirmAdd: '添加'
  },
  pilots: {
    maxed: '已满级 {0} 人',
    maxAll: '全部 Lv10',
    count: '共 {0} 人',
    portrait: '头像',
    name: '姓名',
    level: '等级',
    exp: '经验',
    progress: '进度'
  },
  unlock: {
    unlockedAll: '已解锁全部机型',
    cleared: '已清空解锁',
    itemsUnlocked: '已解锁全部装备',
    unlockAllTypes: '解锁全部机型',
    clearAll: '全部取消',
    unlockAllItems: '解锁全部装备',
    warships: '战舰',
    large: '大型机体',
    small: '小型机体',
    items: '装备（{0}/{1}）'
  },
  collection: {
    maxed: '图鉴已拉满（请用顶部保存写入）',
    maxAll: '一键拉满（结局 + 收藏度）',
    useHostSave: '图鉴改动请通过顶部「保存」写入 collection.cf',
    endingsCount: '结局 {0}/{1}',
    warn: '图鉴写入独立文件 collection.cf，与存档槽互不影响；机体收藏拉满为+6、成员拉满为Lv10。请用宿主保存，不要单独写文件。',
    endings: '结局',
    endingN: '结局 {0}'
  },
  error: {
    FORMATION_OUT_OF_RANGE: '编队坐标越界: [{0},{1}]（有效 row=1..{2}, col=0..{3}）',
    UNIT_INDEX: '机体下标无效: {0}',
    PILOT_TAKEN: '驾驶员已被占用（机体 #{0}）',
    DEPLOYED_NO_PILOT: '已上阵机体缺少驾驶员（机体 #{0}），请先拖驾驶员上去再保存，否则游戏会崩溃',
    ITEM_FULL: '携带道具已满（最多 {0} 件；战舰 4 / 机体 2）',
    ITEM_EMPTY: '仓库中没有该道具（id {0}）',
    ITEM_ID: '无效道具 id: {0}',
    ITEM_SLOT: '无效装备槽位: {0}'
  }
}

export const en: MessageTree = {
  tabs: {
    formation: 'Formation'
  },
  resources: {
    relWarn: 'Relationship values affect the story. Editing may skip or trigger events.',
    timeWarn: 'Endings depend on in-game time; changing only the date may desync story progress.',
    historyYear: 'Committee calendar · Year',
    historyMonth: 'Month',
    historyDay: 'Day',
    credit: 'Credits',
    prestige: 'Prestige',
    star: 'Star rating',
    medal: 'Medal · {0}',
    relationship: 'Relation · {0}',
    maxAll: 'Max credits / prestige / stars',
    factionFallback: 'Faction {0}'
  },
  planets: {
    warn: 'Changing ownership syncs FactionData.planets; careless edits may break the map or story.',
    maxAll: 'Max all current stats',
    count: '{0} planets',
    planet: 'Planet',
    planetFallback: 'Planet #{0}',
    faction: 'Owner',
    factionFallback: 'Faction {0}',
    economics: 'Economy',
    industry: 'Industry',
    defense: 'Defense',
    stability: 'Stability',
    maxTune: 'Cap tweaks',
    econShort: 'Eco',
    indShort: 'Ind'
  },
  formation: {
    hint: 'Deploy a unit first, then drop a pilot onto it—or assign on the bench before deploying. Deployed units need a pilot before save.',
    undeploy: 'Undeploy selected',
    selected: 'Selected: {0} · {1}',
    pilot: 'Pilot',
    noPilot: '(No pilot)',
    col: 'Col {0}',
    row: 'Row {0}',
    empty: 'Empty',
    bench: 'Bench ({0}) · drop here to undeploy',
    benchUnits: 'Bench units ({0}) · drag to grid; drop here to undeploy',
    benchPilots: 'Free pilots ({0}) · drag onto a unit to assign',
    needPilot: 'Needs a pilot',
    noFreePilots: 'No free pilots',
    dropPilotNeedUnit: 'Drop the pilot onto a unit',
    allDeployed: 'All units deployed',
    none: '—',
    detailEmpty: 'Click a unit icon or pilot portrait for details',
    focusUnit: 'Unit info',
    focusPilot: 'Pilot info',
    secWeapons: 'Weapons',
    secAbilities: 'Abilities',
    secItems: 'Equipped items',
    emptySlot: 'Empty',
    equip: 'Equip',
    unequip: 'Unequip',
    inventory: 'Inventory (click to equip)',
    secPilot: 'Pilot',
    secSkills: 'Skills',
    secTalents: 'Talents',
    statAgility: 'Agility',
    statMove: 'Move',
    statLimit: 'Limit',
    statShoot: 'Shoot',
    statManeuver: 'Maneuver',
    statCommand: 'Command',
    statMelee: 'Melee',
    statReaction: 'Reaction'
  },
  units: {
    unknownType: 'Unknown #{0}',
    maxed: 'Maxed {0} units',
    added: 'Added',
    warships: 'Warships',
    large: 'Large mechs',
    small: 'Small mechs',
    maxAll: 'All +6',
    add: 'Add unit',
    count: '{0} units',
    name: 'Name',
    custom: 'Custom',
    pilot: 'Pilot',
    level: 'Level',
    exp: 'XP',
    items: 'Gear',
    actions: 'Actions',
    removeConfirm: 'Delete this unit? Gear returns to inventory.',
    remove: 'Delete',
    addTitle: 'Add unit',
    model: 'Model',
    modelPlaceholder: 'Select model (searchable)',
    initLevel: 'Starting level',
    cancel: 'Cancel',
    confirmAdd: 'Add'
  },
  pilots: {
    maxed: 'Maxed {0} pilots',
    maxAll: 'All Lv10',
    count: '{0} pilots',
    portrait: 'Portrait',
    name: 'Name',
    level: 'Level',
    exp: 'XP',
    progress: 'Progress'
  },
  unlock: {
    unlockedAll: 'All unit types unlocked',
    cleared: 'Unlocks cleared',
    itemsUnlocked: 'All items unlocked',
    unlockAllTypes: 'Unlock all units',
    clearAll: 'Clear all',
    unlockAllItems: 'Unlock all gear',
    warships: 'Warships',
    large: 'Large mechs',
    small: 'Small mechs',
    items: 'Gear ({0}/{1})'
  },
  collection: {
    maxed: 'Collection maxed (use the host Save button)',
    maxAll: 'Max endings + collection',
    useHostSave: 'Collection changes are written by the host Save button to collection.cf',
    endingsCount: 'Endings {0}/{1}',
    warn: 'Writes collection.cf (independent of save slots). Units max at +6, members at Lv10. Use the host save — there is no separate collection write.',
    endings: 'Endings',
    endingN: 'Ending {0}'
  },
  error: {
    FORMATION_OUT_OF_RANGE: 'Formation out of range: [{0},{1}] (row=1..{2}, col=0..{3})',
    UNIT_INDEX: 'Invalid unit index: {0}',
    PILOT_TAKEN: 'Pilot already assigned (unit #{0})',
    DEPLOYED_NO_PILOT:
      'Deployed unit(s) missing pilot (#{0}); assign a pilot before saving or the game will crash',
    ITEM_FULL: 'Item slots full (max {0}; ships 4 / mechs 2)',
    ITEM_EMPTY: 'No stock of item id {0} in inventory',
    ITEM_ID: 'Invalid item id: {0}',
    ITEM_SLOT: 'Invalid item slot: {0}'
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

/** 游戏深文案；跟宿主 locale，不用宿主 t() */
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
