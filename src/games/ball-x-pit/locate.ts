import type { SaveLocator } from '@sdk/types'

export const locate: SaveLocator = {
  windowsPathTemplates: ['%USERPROFILE%\\AppData\\LocalLow\\Kenny Sun\\BALL x PIT'],
  identifyAnyOf: ['meta1.yankai', 'saveslotinfo.balls'],
  identifyNameRegex: '^meta\\d+\\.yankai$',
  slotFilePatterns: ['meta*.yankai', 'saveslotinfo.balls']
}
