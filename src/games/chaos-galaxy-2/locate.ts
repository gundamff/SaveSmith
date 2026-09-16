import type { SaveLocator } from '@sdk/types'

export const locate: SaveLocator = {
  windowsPathTemplates: [
    '%USERPROFILE%\\AppData\\LocalLow\\ChaosGalaxyStudio\\ChaosGalaxy2'
  ],
  identifyAnyOf: [
    'savedata0.cg2',
    'savedata1.cg2',
    'savedata2.cg2',
    'savedata3.cg2',
    'savedata4.cg2',
    'savedata5.cg2',
    'config.cg2'
  ]
}
