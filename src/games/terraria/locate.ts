import type { SaveLocator } from '@sdk/types'

export const locate: SaveLocator = {
  windowsPathTemplates: [
    '%DOCUMENTS%\\My Games\\Terraria',
    '%USERPROFILE%\\Documents\\My Games\\Terraria'
  ],
  identifyAnyOf: ['Players'],
  slotFilePatterns: ['Players/*.plr']
}
