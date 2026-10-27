import type { GameModule } from '@sdk/types'
import { aceCombat8Module } from '../games/ace-combat-8'
import { belmontsCurseModule } from '../games/belmonts-curse'
import { chaosFrontModule } from '../games/chaos-front'
import { chaosGalaxy2Module } from '../games/chaos-galaxy-2'
import { deadCellsModule } from '../games/dead-cells'
import { dragonSwordModule } from '../games/dragon-sword'
import { eslabongModule } from '../games/eslabong'
import { finalFantasyResonanceModule } from '../games/final-fantasy-resonance'
import { terrariaModule } from '../games/terraria'
import { wanderburgModule } from '../games/wanderburg'

export const modules: GameModule[] = [
  chaosFrontModule,
  chaosGalaxy2Module,
  deadCellsModule,
  wanderburgModule,
  terrariaModule,
  dragonSwordModule,
  eslabongModule,
  aceCombat8Module,
  belmontsCurseModule,
  finalFantasyResonanceModule
]
