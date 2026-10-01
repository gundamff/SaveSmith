import type { SaveLocator } from '@sdk/types'

/**
 * Dead Cells saves live either in the game's `save\` folder (Steam Cloud off)
 * or in Steam's userdata cloud mirror (Steam Cloud on) — the local game folder
 * only holds the `steam_cloud.dat` marker in that case. Paths follow the
 * dragon-sword precedent: literal Steam-library candidates plus the cloud
 * mirror; unrecognized layouts fall back to the manual folder picker.
 */
export const locate: SaveLocator = {
  windowsPathTemplates: [
    'C:\\Program Files (x86)\\Steam\\userdata\\1836167462\\588650\\remote',
    'D:\\SteamLibrary\\steamapps\\common\\Dead Cells\\save',
    'E:\\SteamLibrary\\steamapps\\common\\Dead Cells\\save',
    'F:\\SteamLibrary\\steamapps\\common\\Dead Cells\\save',
    '%PROGRAMFILES(X86)%\\Steam\\steamapps\\common\\Dead Cells\\save',
    '%PROGRAMFILES%\\Steam\\steamapps\\common\\Dead Cells\\save'
  ],
  identifyAnyOf: ['user_0.dat', 'user_1.dat', 'user_2.dat'],
  slotFilePatterns: ['user_*.dat']
}
