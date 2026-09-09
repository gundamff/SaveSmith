export function steamStoreUrl(appId: number): string {
  return `https://store.steampowered.com/app/${appId}`
}

export function resolveStoreUrl(catalog: { steamAppId?: number; storeUrl?: string }): string | null {
  if (catalog.steamAppId != null) return steamStoreUrl(catalog.steamAppId)
  if (catalog.storeUrl) return catalog.storeUrl
  return null
}
