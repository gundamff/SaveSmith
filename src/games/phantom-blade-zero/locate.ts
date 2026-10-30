import type { SaveLocator } from '@sdk/types'

export const locate: SaveLocator = {
  windowsPathTemplates: [
    'C:\\Program Files (x86)\\Steam\\steamapps\\common\\PBZ\\ProjectPBZ\\Saved\\SaveGames\\Steam\\*',
    'C:\\Program Files\\Steam\\steamapps\\common\\PBZ\\ProjectPBZ\\Saved\\SaveGames\\Steam\\*',
    'D:\\SteamLibrary\\steamapps\\common\\PBZ\\ProjectPBZ\\Saved\\SaveGames\\Steam\\*',
    'E:\\SteamLibrary\\steamapps\\common\\PBZ\\ProjectPBZ\\Saved\\SaveGames\\Steam\\*',
    'F:\\SteamLibrary\\steamapps\\common\\PBZ\\ProjectPBZ\\Saved\\SaveGames\\Steam\\*'
  ],
  identifyAnyOf: ['PBZSaveGame.sav'],
  slotFilePatterns: ['PBZSaveGame.sav']
}
