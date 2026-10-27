import raw from './names.json'

const table = raw as Record<string, { zh?: string; en?: string } | string>

function lookup(key: string, locale: 'zh' | 'en'): string | null {
  const hit = table[key]
  if (!hit) return null
  if (typeof hit === 'string') return hit
  return (locale === 'zh' ? hit.zh : hit.en) || hit.en || hit.zh || null
}

/**
 * Resolve a display name. Falls back across related key prefixes, then `#id`.
 * `withId` appends ` (#123)` so rows stay unique when names collide.
 */
export function catalogLabel(
  kind: 'item' | 'enemy' | 'map' | 'vision' | 'unit',
  id: number,
  locale: 'zh' | 'en',
  withId = true
): string {
  const keys =
    kind === 'enemy'
      ? [`enemy:${id}`, `unit:${id}`]
      : kind === 'vision'
        ? [`vision:${id}`, `vis:${id}`, `unit:${id}`]
        : kind === 'unit'
          ? [`unit:${id}`, `enemy:${id}`, `vision:${id}`]
          : [`${kind}:${id}`]
  let name: string | null = null
  for (const k of keys) {
    name = lookup(k, locale)
    if (name) break
  }
  if (!name) return `#${id}`
  return withId ? `${name} (#${id})` : name
}
