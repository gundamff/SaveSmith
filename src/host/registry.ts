import type { GameModule } from '@sdk/types'
import { chaosFrontModule } from '../games/chaos-front'
import { chaosGalaxy2Module } from '../games/chaos-galaxy-2'
import { deadCellsModule } from '../games/dead-cells'
import { dragonSwordModule } from '../games/dragon-sword'
import { eslabongModule } from '../games/eslabong'
import { terrariaModule } from '../games/terraria'
import { wanderburgModule } from '../games/wanderburg'

export const modules: GameModule[] = [
  chaosFrontModule,
  chaosGalaxy2Module,
  deadCellsModule,
  wanderburgModule,
  terrariaModule,
  dragonSwordModule,
  eslabongModule
]
