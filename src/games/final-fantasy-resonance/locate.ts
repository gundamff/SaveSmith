import type { SaveLocator } from '@sdk/types'

export const locate: SaveLocator = {
  windowsPathTemplates: ['%USERPROFILE%\\AppData\\Local\\FFRS\\Steam\\*'],
  identifyAnyOf: ['GameSaveData0.sav', 'GameSaveData1.sav'],
  identifyNameRegex: '^GameSaveData\\d+\\.sav$',
  slotFilePatterns: ['GameSaveData*.sav']
}
