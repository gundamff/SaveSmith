const images = import.meta.glob('../assets/game/**/*.png', {
  eager: true,
  import: 'default'
}) as Record<string, string>

export function gameImage(name: string): string {
  return images[`../assets/game/${name}.png`] ?? ''
}
