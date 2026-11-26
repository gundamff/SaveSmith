import { ModuleError } from '@sdk/error'

export type ParsedSavedData = {
  Time: string
  Key: string
  Round: number
  SavedName: string
  Data: Record<string, string>
  raw: Record<string, unknown>
}

export function parseSavedData(json: string): ParsedSavedData {
  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(json) as Record<string, unknown>
  } catch {
    throw new ModuleError('INVALID_FORMAT', ['SavedData'])
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ModuleError('INVALID_FORMAT', ['SavedData'])
  }

  const Time = raw.Time
  const Key = raw.Key
  const Round = raw.Round
  const SavedName = raw.SavedName
  const Data = raw.Data

  if (typeof Time !== 'string') throw new ModuleError('INVALID_FORMAT', ['Time'])
  if (typeof Key !== 'string') throw new ModuleError('INVALID_FORMAT', ['Key'])
  if (typeof Round !== 'number') throw new ModuleError('INVALID_FORMAT', ['Round'])
  if (typeof SavedName !== 'string') throw new ModuleError('INVALID_FORMAT', ['SavedName'])
  if (Data === null || typeof Data !== 'object' || Array.isArray(Data)) {
    throw new ModuleError('INVALID_FORMAT', ['Data'])
  }

  const data: Record<string, string> = {}
  for (const [k, v] of Object.entries(Data as Record<string, unknown>)) {
    if (typeof v === 'string') data[k] = v
    else if (v !== null && v !== undefined) data[k] = String(v)
  }

  return { Time, Key, Round, SavedName, Data: data, raw }
}

export function stringifySavedData(raw: Record<string, unknown>): string {
  return JSON.stringify(raw)
}