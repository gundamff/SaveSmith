export const locate = {
  windowsPathTemplates: [
    '%PROGRAMFILES(X86)%\\Steam\\steamapps\\common\\DragonSword  Awakening\\DS\\Saved\\SaveGames',
    '%PROGRAMFILES%\\Steam\\steamapps\\common\\DragonSword  Awakening\\DS\\Saved\\SaveGames',
    'D:\\SteamLibrary\\steamapps\\common\\DragonSword  Awakening\\DS\\Saved\\SaveGames',
    'E:\\SteamLibrary\\steamapps\\common\\DragonSword  Awakening\\DS\\Saved\\SaveGames',
    'F:\\SteamLibrary\\steamapps\\common\\DragonSword  Awakening\\DS\\Saved\\SaveGames'
  ],
  identifyAnyOf: [] as string[],
  identifyNameRegex: '^[0-9]+$',
  slotFilePatterns: ['*/*_Slot*.db']
}
