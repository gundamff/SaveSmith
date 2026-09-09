import { ref } from 'vue'
import { en } from './en'
import { zh, type MessageTree } from './zh'

export type AppLocale = 'zh' | 'en'

const STORAGE_KEY = 'savesmith-locale'
const catalogs: Record<AppLocale, MessageTree> = { zh, en }

function detectLocale(): AppLocale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'zh' || saved === 'en') return saved
  } catch {
    /* ignore */
  }
  const lang = (typeof navigator !== 'undefined' ? navigator.language : 'zh') || 'zh'
  return lang.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export const locale = ref<AppLocale>(detectLocale())

export function setLocale(next: AppLocale): void {
  locale.value = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* ignore */
  }
}

function lookup(tree: MessageTree, path: string): string | undefined {
  const parts = path.split('.')
  let cur: string | MessageTree | undefined = tree
  for (const p of parts) {
    if (!cur || typeof cur === 'string') return undefined
    cur = cur[p]
  }
  return typeof cur === 'string' ? cur : undefined
}

/** Simple `{0}` `{1}` interpolation; reads `locale` so templates re-render on switch */
export function t(key: string, ...args: Array<string | number>): string {
  void locale.value
  const raw = lookup(catalogs[locale.value], key) ?? lookup(catalogs.zh, key) ?? key
  return raw.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ''))
}
