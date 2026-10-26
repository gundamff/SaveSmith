import type { SaveLocator } from '@sdk/types'

export const locate: SaveLocator = {
  windowsPathTemplates: [
    "%USERPROFILE%\\AppData\\LocalLow\\KONAMI\\Castlevania Belmont's Curse"
  ],
  identifyAnyOf: ['BuildSave_0.sav'],
  identifyNameRegex: '^BuildSave_\\d+\\.sav$',
  slotFilePatterns: ['BuildSave_*.sav']
}
