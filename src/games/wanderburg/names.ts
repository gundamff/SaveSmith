import unlockNames from './data/unlock-names.json'

export function displayName(id: string): string {
  const named = (unlockNames as Record<string, string>)[id]
  if (named) return `${named}（${id}）`
  return `解锁 #${id}`
}
