import type { SaveLocator } from '@sdk/types'

export const locate: SaveLocator = {
  windowsPathTemplates: [
    '%LOCALAPPDATA%\\BANDAI NAMCO Entertainment\\ACE COMBAT 8\\Saved\\SaveGames',
    '%USERPROFILE%\\AppData\\Local\\BANDAI NAMCO Entertainment\\ACE COMBAT 8\\Saved\\SaveGames'
  ],
  identifyAnyOf: ['Campaign.sav', 'System.sav'],
  slotFilePatterns: ['Campaign.sav']
}
