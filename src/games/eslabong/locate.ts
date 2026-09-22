import type { SaveLocator } from '@sdk/types'

export const locate: SaveLocator = {
  windowsPathTemplates: ['%USERPROFILE%\\AppData\\Roaming\\Godot\\app_userdata\\Eslabong'],
  identifyAnyOf: ['campaign_autosave.json'],
  identifyNameRegex: '^campaign_(save_\\d+|autosave(_\\d+)?)\\.json$',
  // Numbered autosave_N is a rolling backup ring — game "手动存档" only shows campaign_save_*.
  // List current autosave + manuals only.
  slotFilePatterns: ['campaign_save_*.json', 'campaign_autosave.json']
}
