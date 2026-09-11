/**
 * Character catalog helpers.
 *
 * New tb_character rows are inserted only for CIDs marked earnable (free/story).
 * An empty catalog never unlocks paid or unknown CIDs.
 */
import charactersJson from '../catalog/characters.json'

export interface CharacterDef {
  characterCid: number
  name: { zh: string; en: string }
  earnable?: boolean
}

export const characterCatalog: CharacterDef[] = charactersJson as CharacterDef[]

export function isEarnableCharacter(cid: number): boolean {
  return characterCatalog.some((row) => row.characterCid === cid && row.earnable === true)
}
