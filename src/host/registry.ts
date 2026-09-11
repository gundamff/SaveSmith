import type { GameModule } from '@sdk/types'
import { chaosFrontModule } from '../games/chaos-front'
import { terrariaModule } from '../games/terraria'
import { wanderburgModule } from '../games/wanderburg'

export const modules: GameModule[] = [chaosFrontModule, wanderburgModule, terrariaModule]
