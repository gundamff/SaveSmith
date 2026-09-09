import type { SaveLocator } from '@sdk/types'

export const locate: SaveLocator = {
  windowsPathTemplates: [
    '%USERPROFILE%\\AppData\\LocalLow\\ChaosGalaxyStudio\\Chaos Front'
  ],
  identifyAnyOf: [
    'savedata0.cf',
    'savedata1.cf',
    'savedata2.cf',
    'savedata3.cf',
    'savedata4.cf',
    'savedata5.cf',
    'collection.cf'
  ]
}
