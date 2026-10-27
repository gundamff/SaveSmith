import raw from './names.json'

const table = raw as Record<string, { zh?: string; en?: string } | string>

export function catalogLabel(kind: 'item' | 'enemy' | 'map' | 'vision', id: number, locale: 'zh' | 'en'): string {
  const key = `${kind}:${id}`
  const hit = table[key]
  if (!hit) return `#${id}`
  if (typeof hit === 'string') return hit
  return (locale === 'zh' ? hit.zh : hit.en) || hit.en || hit.zh || `#${id}`
}
