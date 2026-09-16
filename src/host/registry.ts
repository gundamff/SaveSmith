import type { GameModule } from '@sdk/types'
import { chaosFrontModule } from '../games/chaos-front'
import { chaosGalaxy2Module } from '../games/chaos-galaxy-2'
import { dragonSwordModule } from '../games/dragon-sword'
import { terrariaModule } from '../games/terraria'
import { wanderburgModule } from '../games/wanderburg'

export const modules: GameModule[] = [
  chaosFrontModule,
  chaosGalaxy2Module,
  wanderburgModule,
  terrariaModule,
  dragonSwordModule
]
