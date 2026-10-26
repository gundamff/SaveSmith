import mercyJson from './mercy.json'

export type MercyEntry = {
  guid: string
  name: string
  en: string
  zh: string
}

type MercyJson = {
  tasks: MercyEntry[]
  talents: MercyEntry[]
}

const data = mercyJson as MercyJson

export const MIN_MERCY_TASKS = 30

export function mercyReady(): boolean {
  return data.tasks.length >= MIN_MERCY_TASKS && data.talents.length >= 20
}

export function mercyTasks(): MercyEntry[] {
  return [...data.tasks].sort((a, b) => a.name.localeCompare(b.name))
}

export function mercyTalents(): MercyEntry[] {
  return [...data.talents].sort((a, b) => a.name.localeCompare(b.name))
}

export function mercyTaskGuids(): string[] {
  return mercyTasks().map((t) => t.guid)
}

export function mercyTalentGuids(): string[] {
  return mercyTalents().map((t) => t.guid)
}
