import type { SaveLocator } from '@sdk/types'

/**
 * Dead Cells saves live either in the game's `save\` folder (Steam Cloud off)
 * or in Steam's userdata cloud mirror (Steam Cloud on) — the local game folder
 * only holds the `steam_cloud.dat` marker in that case.
 *
 * Steam's drive, library folder and per-account `userdata\<id>` folder all vary
 * per machine, so common roots are listed literally and the account id uses a
 * `*` wildcard segment. Anything else falls back to the manual folder picker.
 */
export const locate: SaveLocator = {
  windowsPathTemplates: [
    // Steam Cloud mirror: <steam>\userdata\<account>\588650\remote
    'C:\\Program Files (x86)\\Steam\\userdata\\*\\588650\\remote',
    'C:\\Program Files\\Steam\\userdata\\*\\588650\\remote',
    'D:\\Steam\\userdata\\*\\588650\\remote',
    'E:\\Steam\\userdata\\*\\588650\\remote',
    'F:\\Steam\\userdata\\*\\588650\\remote',
    'D:\\SteamLibrary\\userdata\\*\\588650\\remote',
    'E:\\SteamLibrary\\userdata\\*\\588650\\remote',
    'F:\\SteamLibrary\\userdata\\*\\588650\\remote',
    // Local saves next to the game (Steam Cloud off)
    'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Dead Cells\\save',
    'C:\\Program Files\\Steam\\steamapps\\common\\Dead Cells\\save',
    'D:\\SteamLibrary\\steamapps\\common\\Dead Cells\\save',
    'E:\\SteamLibrary\\steamapps\\common\\Dead Cells\\save',
    'F:\\SteamLibrary\\steamapps\\common\\Dead Cells\\save'
  ],
  identifyAnyOf: ['user_0.dat', 'user_1.dat', 'user_2.dat'],
  slotFilePatterns: ['user_*.dat']
}
