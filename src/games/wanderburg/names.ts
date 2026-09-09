import unlockNames from './data/unlock-names.json'

export function displayName(id: string): string {
  return (unlockNames as Record<string, string>)[id] ?? id
}
