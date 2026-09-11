import { locale } from '@host/i18n'
import type { MessageTree } from '@host/i18n/zh'

export const zh: MessageTree = {
  currency: {
    empty: '暂无货币记录',
    cid: 'CID',
    amount: '数量',
    maxAll: '货币拉满',
    maxed: '已将货币拉满'
  },
  items: {
    empty: '暂无堆叠物品',
    cid: 'CID',
    stack: '堆叠',
    add: '添加',
    addCid: '物品 CID',
    addStack: '数量',
    added: '已添加'
  },
  characters: {
    empty: '暂无角色',
    cid: '角色 CID',
    level: '等级',
    exp: '经验',
    ascend: '突破'
  },
  team: {
    empty: '暂无编队',
    page: '页',
    slot: '槽位',
    emptySlot: '空'
  },
  equipment: {
    empty: '暂无装备',
    cid: '装备 CID',
    enchant: '强化',
    exp: '经验',
    lock: '锁定',
    mainStat: '主词条 CID',
    subStat: '副词条 CID'
  },
  cooking: {
    empty: '暂无料理',
    cid: 'CID',
    stack: '堆叠',
    switchKey: '配方 switchKey',
    unlock: '解锁',
    lock: '锁定',
    unlockAll: '配方全开',
    unlocked: '已解锁配方',
    locked: '已锁定配方',
    recipe: '配方',
    known: '已知'
  }
}

export const en: MessageTree = {
  currency: {
    empty: 'No currency rows',
    cid: 'CID',
    amount: 'Amount',
    maxAll: 'Max currency',
    maxed: 'Currency amounts maxed'
  },
  items: {
    empty: 'No stackable items',
    cid: 'CID',
    stack: 'Stack',
    add: 'Add',
    addCid: 'Item CID',
    addStack: 'Stack',
    added: 'Added'
  },
  characters: {
    empty: 'No characters',
    cid: 'Character CID',
    level: 'Level',
    exp: 'Exp',
    ascend: 'Ascend'
  },
  team: {
    empty: 'No team pages',
    page: 'Page',
    slot: 'Slot',
    emptySlot: 'Empty'
  },
  equipment: {
    empty: 'No equipment',
    cid: 'Gear CID',
    enchant: 'Enchant',
    exp: 'Exp',
    lock: 'Lock',
    mainStat: 'Main stat CID',
    subStat: 'Sub stat CIDs'
  },
  cooking: {
    empty: 'No cooked dishes',
    cid: 'CID',
    stack: 'Stack',
    switchKey: 'Recipe switchKey',
    unlock: 'Unlock',
    lock: 'Lock',
    unlockAll: 'Unlock all recipes',
    unlocked: 'Recipe unlocked',
    locked: 'Recipe locked',
    recipe: 'Recipe',
    known: 'Known'
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

/** Game-deep copy; follows host locale, not host t(). */
export function t(key: string, ...args: Array<string | number>): string {
  void locale.value
  const raw = lookup(catalogs[locale.value], key) ?? lookup(catalogs.zh, key) ?? key
  return raw.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ''))
}
