import { ModuleError } from '@sdk/error'
import type { SerializedFile, SlotBytes, ValidationIssue } from '@sdk/types'
import {
  buildContainer,
  getChunk,
  parseContainer,
  replaceChunk,
  type DcContainer
} from './model/container'
import { decodeHxs, encodeHxs, type HxsDoc } from './model/hxbit'
import { projectUser } from './model/userModel'

const USER_SLOT = /user_\d+\.dat$/i

export interface DeadCellsState {
  relativePath: string
  container: DcContainer
  doc: HxsDoc
}

export async function parse(files: SlotBytes[]): Promise<DeadCellsState> {
  const f = files.find((x) => USER_SLOT.test(x.relativePath))
  if (!f) throw new ModuleError('MISSING_FIELD', ['user_*.dat'])
  let container: DcContainer
  try {
    container = await parseContainer(f.bytes)
  } catch {
    throw new ModuleError('PARSE_FAILED', [f.relativePath])
  }
  const user = getChunk(container, 'S_User')
  if (!user) throw new ModuleError('MISSING_FIELD', ['S_User'])
  const doc = decodeHxs(user.data, 'User')
  return { relativePath: f.relativePath, container, doc }
}

export async function serialize(state: DeadCellsState): Promise<SerializedFile[]> {
  const userChunk = encodeHxs(state.doc)
  const container = replaceChunk(state.container, 'S_User', userChunk)
  const bytes = await buildContainer(container)
  return [{ relativePath: state.relativePath, bytes }]
}

export function validate(state: DeadCellsState): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const view = projectUser(state.doc)
  if (!view.editable) {
    issues.push({ code: 'PARSE_FAILED', args: ['S_User'] })
    return issues
  }
  // Note: itemProgress.investedCells uses negative sentinels in real saves
  // (e.g. -2), so only the top-level resources are range-checked here.
  if (view.deathMoney < 0) issues.push({ code: 'INVALID_AMOUNT', args: ['deathMoney'] })
  if (view.deathCells < 0) issues.push({ code: 'INVALID_AMOUNT', args: ['deathCells'] })
  return issues
}
