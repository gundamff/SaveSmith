import type { SaveLocator } from '@sdk/types'

/**
 * Steam PC uses `GameSaveDataN.sav`. Nintendo Switch dumps (JKSV / Checkpoint)
 * use the same SVHD payload but **no** `.sav` suffix under title id folders
 * (e.g. `0100B8A026F14000/GameSaveData0`).
 */
export const locate: SaveLocator = {
  windowsPathTemplates: ['%USERPROFILE%\\AppData\\Local\\FFRS\\Steam\\*'],
  identifyAnyOf: ['GameSaveData0.sav', 'GameSaveData1.sav', 'GameSaveData0', 'GameSaveData1'],
  identifyNameRegex: '^GameSaveData\\d+(\\.sav)?$',
  // One glob covers both `GameSaveData0` and `GameSaveData0.sav` (segment `*` → `.*`).
  slotFilePatterns: ['GameSaveData*']
}
