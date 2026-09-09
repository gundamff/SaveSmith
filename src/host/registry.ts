import type { GameModule } from '@sdk/types'
import { chaosFrontModule } from '../games/chaos-front'
import { wanderburgModule } from '../games/wanderburg'

export const modules: GameModule[] = [chaosFrontModule, wanderburgModule]
